import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { aiGenerations, aiSources } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import { generateDraft } from '@/server/ai-provider';
import { createLinkpage } from '@/server/linkpages';
import { createForm } from '@/server/forms';
import { aiKinds, aiLimits, costMicros, formFromDraft, linkpageFromDraft, type AiSourceRecord, type GenerationRecord } from '@/lib/ai';
import type { FormContent } from '@/lib/forms';
import type { LinkpageContent } from '@/lib/linkpages';

const id = z.uuid();
const plainText = (max: number) => z.string().trim().min(1).max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), 'Invalid characters');

const sourceRecord = (row: typeof aiSources.$inferSelect): AiSourceRecord => ({ id: row.id, title: row.title, characters: row.content.length, created_at: row.createdAt.toISOString() });

export async function listSources(workspaceId: string) {
  const rows = await getDb().select().from(aiSources).where(eq(aiSources.userId, workspaceId)).orderBy(desc(aiSources.createdAt));
  return rows.map(sourceRecord);
}

/** Text the assistant may draw facts from (menu, about page, event details). Stays inside the workspace. */
export async function createSource(workspaceId: string, input: unknown) {
  const parsed = z.object({ title: plainText(80), content: z.string().trim().min(1).max(aiLimits.sourceChars) }).strict().safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Give the source a title and up to 20,000 characters of text');
  return getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'ai-sources:' + workspaceId}))`);
    const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` }).from(aiSources).where(eq(aiSources.userId, workspaceId));
    if (total >= aiLimits.sourcesPerWorkspace) throw new HttpError(409, 'You reached the source limit. Delete a source to add another.');
    const [row] = await tx.insert(aiSources).values({ userId: workspaceId, title: parsed.data.title, content: parsed.data.content }).returning();
    return sourceRecord(row);
  });
}

export async function deleteSource(workspaceId: string, sourceId: string) {
  if (!id.safeParse(sourceId).success) throw new HttpError(404, 'Source not found');
  const [row] = await getDb().delete(aiSources).where(and(eq(aiSources.userId, workspaceId), eq(aiSources.id, sourceId))).returning({ id: aiSources.id });
  if (!row) throw new HttpError(404, 'Source not found');
  return { deleted: true };
}

const record = (row: typeof aiGenerations.$inferSelect): GenerationRecord => ({
  id: row.id, kind: row.kind as GenerationRecord['kind'], prompt: row.prompt, status: row.status as GenerationRecord['status'], error: row.error, dropped: row.dropped,
  preview: (row.output as LinkpageContent | FormContent | null) ?? null, target_id: row.targetId, input_tokens: row.inputTokens, output_tokens: row.outputTokens,
  cost_micros: row.costMicros, created_at: row.createdAt.toISOString(), reviewed_at: row.reviewedAt?.toISOString() ?? null,
});

export async function listGenerations(workspaceId: string) {
  const rows = await getDb().select().from(aiGenerations).where(eq(aiGenerations.userId, workspaceId)).orderBy(desc(aiGenerations.createdAt)).limit(50);
  return rows.map(record);
}

/** Usage in the current day and month (UTC), counting every request that reached the assistant. */
export async function usage(workspaceId: string) {
  const { rows } = await getDb().execute<{ day: number; month: number; cost: number }>(sql`select
      count(*) filter (where created_at >= date_trunc('day', now()))::int as day,
      count(*)::int as month,
      coalesce(sum(cost_micros), 0)::bigint as cost
    from qrconnect.ai_generations where user_id = ${workspaceId} and created_at >= date_trunc('month', now())`);
  return { day: rows[0].day, month: rows[0].month, cost_micros: Number(rows[0].cost), limits: { day: aiLimits.perDay, month: aiLimits.perMonth } };
}

/**
 * Asks the assistant for a draft. The result waits in the review queue; nothing is created or published until a person approves it.
 * The quota is reserved under a lock before the provider call, so concurrent requests cannot exceed it.
 */
export async function requestGeneration(workspaceId: string, actorId: string, input: unknown) {
  const parsed = z.object({ kind: z.enum(aiKinds), prompt: plainText(aiLimits.promptChars), source_ids: z.array(z.uuid()).max(aiLimits.sourcesPerGeneration).default([]) }).strict().safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Describe what to create in up to 2,000 characters and choose up to 5 sources');
  const sources = parsed.data.source_ids.length ? await getDb().select({ title: aiSources.title, content: aiSources.content }).from(aiSources)
    .where(and(eq(aiSources.userId, workspaceId), inArray(aiSources.id, [...new Set(parsed.data.source_ids)]))) : [];
  if (sources.length !== new Set(parsed.data.source_ids).size) throw new HttpError(404, 'Source not found');
  const reserved = await getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'ai-generations:' + workspaceId}))`);
    const current = await tx.execute<{ day: number; month: number }>(sql`select
        count(*) filter (where created_at >= date_trunc('day', now()))::int as day, count(*)::int as month
      from qrconnect.ai_generations where user_id = ${workspaceId} and created_at >= date_trunc('month', now())`);
    if (current.rows[0].day >= aiLimits.perDay || current.rows[0].month >= aiLimits.perMonth) throw new HttpError(429, 'You reached the assisted creation limit for now. It resets each day and each month.');
    const [row] = await tx.insert(aiGenerations).values({ userId: workspaceId, createdBy: actorId, kind: parsed.data.kind, prompt: parsed.data.prompt, status: 'failed', error: 'In progress' }).returning({ id: aiGenerations.id });
    return row.id;
  });
  try {
    const result = await generateDraft(parsed.data.kind, parsed.data.prompt, sources);
    const built = parsed.data.kind === 'linkpage' ? linkpageFromDraft(result.draft as Parameters<typeof linkpageFromDraft>[0]) : formFromDraft(result.draft as Parameters<typeof formFromDraft>[0]);
    const [row] = await getDb().update(aiGenerations).set({ status: 'pending_review', error: null, output: built.content, dropped: built.dropped,
      inputTokens: result.inputTokens, outputTokens: result.outputTokens, costMicros: costMicros(result.inputTokens, result.outputTokens) })
      .where(eq(aiGenerations.id, reserved)).returning();
    return record(row);
  } catch (error) {
    const message = error instanceof HttpError ? error.message : 'The assistant could not write a draft. Try again.';
    await getDb().update(aiGenerations).set({ status: 'failed', error: message }).where(eq(aiGenerations.id, reserved));
    throw error instanceof HttpError ? error : new HttpError(502, message);
  }
}

/** Approve creates an unpublished draft from the reviewed content; reject keeps the record for history. Each generation is decided once. */
export async function reviewGeneration(workspaceId: string, actorId: string, generationId: string, input: unknown) {
  const parsed = z.object({ decision: z.enum(['approve', 'reject']) }).strict().safeParse(input);
  if (!parsed.success || !id.safeParse(generationId).success) throw new HttpError(400, 'Choose approve or reject');
  const [claimed] = await getDb().update(aiGenerations).set({ status: parsed.data.decision === 'approve' ? 'approved' : 'rejected', reviewedBy: actorId, reviewedAt: sql`now()` })
    .where(and(eq(aiGenerations.userId, workspaceId), eq(aiGenerations.id, generationId), eq(aiGenerations.status, 'pending_review'))).returning();
  if (!claimed) {
    const [exists] = await getDb().select({ id: aiGenerations.id }).from(aiGenerations).where(and(eq(aiGenerations.userId, workspaceId), eq(aiGenerations.id, generationId)));
    throw exists ? new HttpError(409, 'This draft was already reviewed') : new HttpError(404, 'Draft not found');
  }
  if (parsed.data.decision === 'reject') return record(claimed);
  try {
    // The generation id is the creation key, so a retry never creates a second draft.
    const targetId = claimed.kind === 'linkpage'
      ? (await createLinkpage(workspaceId, { template: 'blank', creation_key: claimed.id, title: (claimed.output as LinkpageContent).profile.name || 'Linkpage' }, claimed.output as LinkpageContent)).page.id
      : (await createForm(workspaceId, { template: 'blank', creation_key: claimed.id }, claimed.output as FormContent)).form.id;
    const [row] = await getDb().update(aiGenerations).set({ targetId }).where(eq(aiGenerations.id, claimed.id)).returning();
    return record(row);
  } catch (error) {
    await getDb().update(aiGenerations).set({ status: 'pending_review', reviewedBy: null, reviewedAt: null }).where(eq(aiGenerations.id, claimed.id));
    throw error;
  }
}
