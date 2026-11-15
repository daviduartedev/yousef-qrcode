import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { assets, formEvents, formResponses, forms, qrCodes } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import { getServerEnv } from '@/server/env';
import { createCode } from '@/server/qr-codes';
import { visitorFrom } from '@/server/visitor';
import { after } from 'next/server';
import { emitAndDeliver } from '@/server/webhooks';
import { claimSlug, slugFree } from '@/server/public-slugs';
import { deactivateLinkedCodes } from '@/server/qr-linked-cleanup';
import { csvCell, duplicateWindowSeconds } from '@/lib/qr-analytics';
import { slugify, validSlug } from '@/lib/linkpages';
import { formContentSchema, formLimits, formTemplates, validateAnswers, type FormContent, type FormRecord, type FormResponseRecord, type FormSummary } from '@/lib/forms';

const id = z.uuid();
type Row = typeof forms.$inferSelect;

const views30 = sql<number>`(select count(*)::int from qrconnect.form_events e where e.form_id = "forms"."id" and e.kind = 'view' and e.occurred_at >= now() - interval '30 days')`;
const responsesTotal = sql<number>`(select count(*)::int from qrconnect.form_responses r where r.form_id = "forms"."id")`;

function summary(row: Row, extra: { views?: number; responses?: number } = {}): FormSummary {
  return {
    id: row.id, title: row.title, slug: row.slug, template: row.template, is_published: row.isPublished, published_at: row.publishedAt?.toISOString() ?? null,
    has_unpublished_changes: !row.published || JSON.stringify(row.published) !== JSON.stringify(row.draft), accepting_responses: row.acceptingResponses,
    updated_at: row.updatedAt.toISOString(), views_30d: extra.views ?? 0, responses_total: extra.responses ?? 0, qr_code_id: row.qrCodeId,
  };
}
const record = (row: Row): FormRecord => ({ ...summary(row), draft: row.draft as FormContent, published: (row.published as FormContent | null) ?? null });

export async function listForms(userId: string) {
  const rows = await getDb().select({ form: forms, views: views30, responses: responsesTotal }).from(forms)
    .where(eq(forms.userId, userId)).orderBy(desc(forms.updatedAt), desc(forms.id));
  return rows.map(({ form, views, responses }) => summary(form, { views, responses }));
}

async function ownedRow(userId: string, formId: string) {
  if (!id.safeParse(formId).success) throw new HttpError(404, 'Form not found');
  const [row] = await getDb().select().from(forms).where(and(eq(forms.userId, userId), eq(forms.id, formId)));
  if (!row) throw new HttpError(404, 'Form not found');
  return row;
}
export async function getForm(userId: string, formId: string) { return record(await ownedRow(userId, formId)); }

const createInput = z.object({ template: z.string(), creation_key: z.uuid() }).strict();

/** Same key, same form: double clicks and retries never create two drafts. */
/** `draft` is set only by reviewed assisted creation; requests from people always start from a template. */
export async function createForm(userId: string, input: unknown, draft?: FormContent) {
  const parsed = createInput.safeParse(input);
  const template = parsed.success ? formTemplates.find(item => item.id === parsed.data.template) : undefined;
  if (!parsed.success || !template) throw new HttpError(400, 'Choose a valid template');
  const content = draft ?? template.content();
  return getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'forms:' + userId}))`);
    const [existing] = await tx.select().from(forms).where(and(eq(forms.userId, userId), eq(forms.creationKey, parsed.data.creation_key)));
    if (existing) return { form: record(existing), created: false };
    const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` }).from(forms).where(eq(forms.userId, userId));
    if (total >= formLimits.maxForms) throw new HttpError(409, 'You reached the form limit. Delete a form to create another.');
    const base = slugify(content.title) || 'form';
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = `${base.slice(0, 30)}-${randomBytes(3).toString('hex')}`;
      if (!(await slugFree(tx, 'form', slug, userId))) continue;
      await claimSlug(tx, 'form', slug, userId);
      const [row] = await tx.insert(forms).values({ userId, slug, title: content.title, template: template.id, creationKey: parsed.data.creation_key, draft: content }).returning();
      return { form: record(row), created: true };
    }
    throw new HttpError(503, 'Could not create the form. Try again.');
  });
}

async function assertMedia(userId: string, content: FormContent) {
  if (!content.coverAssetId) return;
  const [row] = await getDb().select({ id: assets.id }).from(assets).where(and(eq(assets.userId, userId), eq(assets.id, content.coverAssetId), eq(assets.kind, 'image')));
  if (!row) throw new HttpError(400, 'Choose images from your library');
}

const updateInput = z.object({
  draft: z.unknown().optional(), title: z.string().trim().min(1).max(120).optional(), slug: z.string().trim().toLowerCase().optional(),
  accepting_responses: z.boolean().optional(),
}).strict();

export async function updateForm(userId: string, formId: string, input: unknown) {
  const parsed = updateInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Invalid form changes');
  const row = await ownedRow(userId, formId);
  const changes: Partial<typeof forms.$inferInsert> = {};
  if (parsed.data.draft !== undefined) {
    const draft = formContentSchema.safeParse(parsed.data.draft);
    if (!draft.success) throw new HttpError(400, 'Some questions are incomplete or invalid');
    await assertMedia(userId, draft.data);
    changes.draft = draft.data;
  }
  if (parsed.data.title !== undefined) changes.title = parsed.data.title;
  if (parsed.data.accepting_responses !== undefined) changes.acceptingResponses = parsed.data.accepting_responses;
  const renaming = parsed.data.slug !== undefined && parsed.data.slug !== row.slug;
  if (renaming) {
    if (row.published || row.qrCodeId) throw new HttpError(409, 'The address cannot change after the form was published or got a QR code');
    if (!validSlug(parsed.data.slug!)) throw new HttpError(400, 'Use 3–40 lowercase letters, numbers or hyphens');
    changes.slug = parsed.data.slug;
  }
  return getDb().transaction(async tx => {
    if (renaming) await claimSlug(tx, 'form', changes.slug!, userId);
    const [updated] = await tx.update(forms).set({ ...changes, updatedAt: new Date() })
      .where(and(eq(forms.userId, userId), eq(forms.id, formId), renaming ? and(isNull(forms.published), isNull(forms.qrCodeId)) : undefined)).returning();
    if (!updated) throw new HttpError(409, 'The address cannot change after the form was published or got a QR code');
    return record(updated);
  }).catch(error => {
    if ((error as { cause?: { code?: string } }).cause?.code === '23505') throw new HttpError(409, 'This address is already taken');
    throw error;
  });
}

export async function publishForm(userId: string, formId: string, publish: boolean) {
  const row = await ownedRow(userId, formId);
  if (publish) {
    const draft = formContentSchema.safeParse(row.draft);
    if (!draft.success) throw new HttpError(400, 'Some questions are incomplete or invalid');
    await assertMedia(userId, draft.data);
  }
  const [updated] = await getDb().update(forms).set(publish
    ? { published: sql`draft`, isPublished: true, publishedAt: new Date(), updatedAt: new Date() }
    : { isPublished: false, updatedAt: new Date() })
    .where(and(eq(forms.userId, userId), eq(forms.id, formId))).returning();
  return record(updated);
}

/** Deleting a form removes its answers, deactivates its QR code and keeps the address reserved. */
export async function deleteForm(userId: string, formId: string) {
  if (!id.safeParse(formId).success) throw new HttpError(404, 'Form not found');
  return getDb().transaction(async tx => {
    const [row] = await tx.delete(forms).where(and(eq(forms.userId, userId), eq(forms.id, formId))).returning({ id: forms.id, qrCodeId: forms.qrCodeId });
    if (!row) throw new HttpError(404, 'Form not found');
    await deactivateLinkedCodes(tx, userId, 'form', row.id);
    if (row.qrCodeId) await tx.update(qrCodes).set({ isActive: false, updatedAt: new Date() }).where(and(eq(qrCodes.userId, userId), eq(qrCodes.id, row.qrCodeId)));
    return { deleted: true, qr_code_deactivated: Boolean(row.qrCodeId) };
  });
}

export const publicFormUrl = (slug: string) => `${getServerEnv().appUrl}/f/${slug}`;

export async function formQr(userId: string, formId: string) {
  if (!id.safeParse(formId).success) throw new HttpError(404, 'Form not found');
  return getDb().transaction(async tx => {
    const [row] = await tx.select().from(forms).where(and(eq(forms.userId, userId), eq(forms.id, formId))).for('update');
    if (!row) throw new HttpError(404, 'Form not found');
    if (row.qrCodeId) return { qr_code_id: row.qrCodeId, created: false };
    const qr = await createCode(userId, { title: row.title, destination_url: publicFormUrl(row.slug), tracking_enabled: true });
    await tx.update(forms).set({ qrCodeId: qr.qrCode.id }).where(eq(forms.id, formId));
    return { qr_code_id: qr.qrCode.id, created: true };
  });
}

const slugParam = z.string().regex(/^[a-z0-9-]{3,40}$/);
export async function publicForm(slug: string) {
  if (!slugParam.safeParse(slug).success) return null;
  const [row] = await getDb().select({ id: forms.id, userId: forms.userId, slug: forms.slug, published: forms.published, accepting: forms.acceptingResponses })
    .from(forms).where(and(eq(forms.slug, slug), eq(forms.isPublished, true)));
  const content = row ? formContentSchema.safeParse(row.published) : null;
  return row && content?.success ? { id: row.id, userId: row.userId, slug: row.slug, accepting: row.accepting, content: content.data } : null;
}

/** Counts a view of the published form; bots, cross-site requests and repeats within 10 s are skipped. */
export async function recordFormView(request: Request, slug: string) {
  const form = await publicForm(slug);
  if (!form) return false;
  const visitor = visitorFrom(request);
  if (visitor.bot || request.headers.get('sec-fetch-site') === 'cross-site') return true;
  await getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'form:' + form.id}))`);
    const [{ recent }] = await tx.select({ recent: sql<number>`count(*)::int` }).from(formEvents)
      .where(and(eq(formEvents.formId, form.id), eq(formEvents.kind, 'view'), sql`${formEvents.occurredAt} >= now() - interval '60 seconds'`));
    if (recent >= 300) return;
    if (visitor.ipAddress) {
      const [{ repeats }] = await tx.select({ repeats: sql<number>`count(*)::int` }).from(formEvents).where(and(eq(formEvents.formId, form.id), eq(formEvents.kind, 'view'),
        eq(formEvents.ipAddress, visitor.ipAddress), eq(formEvents.userAgent, visitor.userAgent), sql`${formEvents.occurredAt} >= now() - make_interval(secs => ${duplicateWindowSeconds})`));
      if (repeats > 0) return;
    }
    await tx.insert(formEvents).values({ formId: form.id, kind: 'view', deviceType: visitor.deviceType, ipAddress: visitor.ipAddress, userAgent: visitor.userAgent });
  });
  return true;
}

export class FormValidationError extends HttpError {
  constructor(public readonly fields: Record<string, string>) { super(400, 'Check the highlighted answers'); }
}

const submissionSchema = z.object({
  answers: z.record(z.string().max(24), z.unknown()),
  consent: z.boolean().optional(),
  form_token: z.string().max(200).optional(),
  /** Honeypot: people never fill it. */
  company_website: z.string().max(200).optional(),
}).strict();

/** Public submission: checked against the published questions, with honeypot, consent, size and rolling rate limits. */
export async function submitForm(request: Request, slug: string, input: unknown) {
  const form = await publicForm(slug);
  if (!form) throw new HttpError(404, 'Form not found');
  if (!form.accepting) throw new HttpError(410, 'This form is not accepting answers');
  const body = submissionSchema.safeParse(input);
  if (!body.success) throw new HttpError(400, 'Invalid answers');
  const visitor = visitorFrom(request);
  // Honeypot and bots look accepted; nothing is stored.
  if (body.data.company_website || visitor.bot) return { accepted: true };
  const { answers, errors } = validateAnswers(form.content, body.data.answers);
  if (form.content.consent.enabled && body.data.consent !== true) errors.consent = 'Accept the consent to send your answers';
  if (Object.keys(errors).length) throw new FormValidationError(errors);
  // Checked after the answers so people see field errors first.
  if (!validFormToken(form.id, body.data.form_token)) throw new HttpError(400, 'Reload the page and send again');
  const result = await getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'form-responses:' + form.id}))`);
    const { rows } = await tx.execute<{ minute: number; hour: number; day: number; total: number; same: number }>(sql`select
        count(*) filter (where created_at >= now() - interval '1 minute')::int as minute,
        count(*) filter (where created_at >= now() - interval '1 hour')::int as hour,
        count(*) filter (where created_at >= now() - interval '1 day')::int as day,
        count(*)::int as total,
        count(*) filter (where ${visitor.ipAddress}::text is not null and ip_address = ${visitor.ipAddress} and created_at >= now() - interval '1 hour')::int as same
      from qrconnect.form_responses where form_id = ${form.id}`);
    if (rows[0].minute >= 30 || rows[0].hour >= 300 || rows[0].day >= 1000 || rows[0].same >= 10) throw new HttpError(429, 'Too many answers were sent. Try again later.');
    if (rows[0].total >= formLimits.maxResponsesPerForm) throw new HttpError(409, 'This form cannot receive more answers right now');
    const { rows: owner } = await tx.execute<{ total: number }>(sql`select count(*)::int as total from qrconnect.form_responses where user_id = ${form.userId}`);
    if (owner[0].total >= formLimits.maxResponsesPerOwner) throw new HttpError(409, 'This form cannot receive more answers right now');
    await tx.insert(formResponses).values({
      userId: form.userId, formId: form.id, answers, labels: Object.fromEntries(form.content.fields.map(field => [field.id, field.label])),
      consentText: form.content.consent.enabled ? form.content.consent.text : null, ipAddress: visitor.ipAddress,
    });
    await tx.insert(formEvents).values({ formId: form.id, kind: 'submit', deviceType: visitor.deviceType, ipAddress: visitor.ipAddress, userAgent: visitor.userAgent });
    return { accepted: true };
  });
  after(() => emitAndDeliver(form.userId, 'form.submitted', { form_id: form.id, title: form.content.title, submitted_at: new Date().toISOString(),
    answers: form.content.fields.map(field => ({ id: field.id, label: field.label, value: answers[field.id] ?? null })) }));
  return result;
}

export async function listFormResponses(userId: string, formId: string, page = 1) {
  const form = await ownedRow(userId, formId);
  const size = 50;
  const owned = and(eq(formResponses.userId, userId), eq(formResponses.formId, formId));
  const [{ total }] = await getDb().select({ total: sql<number>`count(*)::int` }).from(formResponses).where(owned);
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), pageCount);
  const rows = await getDb().select().from(formResponses).where(owned).orderBy(desc(formResponses.createdAt), desc(formResponses.id)).limit(size).offset((current - 1) * size);
  const { rows: stats } = await getDb().execute<{ views: number; submits: number }>(sql`select count(*) filter (where kind = 'view')::int as views,
    count(*) filter (where kind = 'submit')::int as submits from qrconnect.form_events where form_id = ${formId} and occurred_at >= now() - interval '30 days'`);
  return {
    form: record(form), total, page: current, pageCount, stats: stats[0],
    responses: rows.map((row): FormResponseRecord => ({ id: row.id, created_at: row.createdAt.toISOString(), answers: row.answers as FormResponseRecord['answers'],
      labels: row.labels as Record<string, string>, consent_text: row.consentText })),
  };
}

export async function deleteFormResponse(userId: string, formId: string, responseId: string) {
  if (!id.safeParse(responseId).success || !id.safeParse(formId).success) throw new HttpError(404, 'Answer not found');
  const [row] = await getDb().delete(formResponses).where(and(eq(formResponses.userId, userId), eq(formResponses.formId, formId), eq(formResponses.id, responseId)))
    .returning({ id: formResponses.id });
  if (!row) throw new HttpError(404, 'Answer not found');
  return { deleted: true };
}

/** CSV with one column per current question, plus columns for answers to questions removed since. */
export async function formResponsesCsv(userId: string, formId: string) {
  const form = await ownedRow(userId, formId);
  const content = (form.published ?? form.draft) as FormContent;
  const rows = await getDb().select().from(formResponses).where(and(eq(formResponses.userId, userId), eq(formResponses.formId, formId)))
    .orderBy(formResponses.createdAt, formResponses.id).limit(formLimits.maxResponsesPerForm);
  const columns = content.fields.map(field => ({ id: field.id, label: field.label }));
  for (const row of rows) for (const [key, label] of Object.entries(row.labels as Record<string, string>)) {
    const column = columns.find(item => item.id === key);
    if (!column) columns.push({ id: key, label: `${label} (removed)` });
    // Answers given when the question read differently are flagged, so their meaning is not mixed up.
    else if (column.label !== label && !column.label.endsWith(' (edited)')) column.label = `${column.label} (edited)`;
  }
  const lines = [['submitted_at', ...columns.map(column => column.label), 'consent'].map(value => csvCell(value)).join(',')];
  for (const row of rows) {
    const answers = row.answers as Record<string, unknown>;
    const cells = columns.map(column => {
      const value = answers[column.id];
      return value === null || value === undefined ? '' : typeof value === 'boolean' ? (value ? 'yes' : 'no') : String(value);
    });
    lines.push([row.createdAt.toISOString(), ...cells, row.consentText ?? ''].map(value => csvCell(value)).join(','));
  }
  return { csv: '﻿' + lines.join('\r\n') + '\r\n', slug: form.slug };
}

/** Public cover image of a published form; no other library file is reachable. */
export async function formMedia(slug: string, assetId: string) {
  const form = await publicForm(slug);
  if (!form || !id.safeParse(assetId).success || form.content.coverAssetId !== assetId) return null;
  const [row] = await getDb().select({ mimeType: assets.mimeType, content: assets.content, sha256: assets.sha256 }).from(assets)
    .where(and(eq(assets.userId, form.userId), eq(assets.id, assetId), eq(assets.kind, 'image')));
  return row ?? null;
}

const tokenMinAgeMs = 2000;
const tokenMaxAgeMs = 24 * 60 * 60 * 1000;
const tokenSignature = (formId: string, issuedAt: number) =>
  createHmac('sha256', getServerEnv().secret).update(`form-token:${formId}:${issuedAt}`).digest('base64url');

/** Token rendered with the public form; a submission must come from a page loaded at least two seconds earlier. */
export function formSubmissionToken(formId: string, now = Date.now()) {
  return `${now}.${tokenSignature(formId, now)}`;
}

export function validFormToken(formId: string, token: string | undefined, now = Date.now()) {
  const [issued, signature] = (token ?? '').split('.');
  const issuedAt = Number(issued);
  if (!Number.isSafeInteger(issuedAt) || !signature) return false;
  const expected = Buffer.from(tokenSignature(formId, issuedAt));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  const age = now - issuedAt;
  return age >= tokenMinAgeMs && age <= tokenMaxAgeMs;
}
