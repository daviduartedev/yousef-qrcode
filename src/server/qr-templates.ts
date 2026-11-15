import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { qrTemplates } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import { hasVisibleContrast, qrDesignSchema, type QRDesign } from '@/lib/qr-design';
import { ownsImageAsset } from '@/server/assets';

export const maxTemplates = 50;
const input = z.object({ name: z.string().trim().min(1).max(60).refine(value => !/[\u0000-\u001f\u007f]/.test(value)), design: qrDesignSchema.refine(hasVisibleContrast) }).strict();

export type SavedTemplate = { id: string; name: string; design: QRDesign; created_at: string };

export async function listTemplates(workspaceId: string): Promise<SavedTemplate[]> {
  const rows = await getDb().select().from(qrTemplates).where(eq(qrTemplates.userId, workspaceId)).orderBy(desc(qrTemplates.createdAt));
  return rows.map(row => ({ id: row.id, name: row.name, design: row.design as QRDesign, created_at: row.createdAt.toISOString() }));
}

/** Saves a design for reuse; a library logo must belong to the same workspace. */
export async function saveTemplate(workspaceId: string, body: unknown, createdBy?: string) {
  const parsed = input.safeParse(body);
  if (!parsed.success) throw new HttpError(400, 'Enter a name and a valid design');
  if (parsed.data.design.logoAssetId && !(await ownsImageAsset(workspaceId, parsed.data.design.logoAssetId))) throw new HttpError(400, 'The selected logo is not in your library');
  return getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'qr-templates:' + workspaceId}))`);
    const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` }).from(qrTemplates).where(eq(qrTemplates.userId, workspaceId));
    if (total >= maxTemplates) throw new HttpError(409, 'You reached the template limit. Delete a template to save another.');
    const [row] = await tx.insert(qrTemplates).values({ userId: workspaceId, name: parsed.data.name, design: parsed.data.design, createdBy: createdBy ?? null }).returning();
    return { id: row.id, name: row.name, design: row.design as QRDesign, created_at: row.createdAt.toISOString() };
  });
}

export async function deleteTemplate(workspaceId: string, templateId: string) {
  if (!z.uuid().safeParse(templateId).success) throw new HttpError(404, 'Template not found');
  const [row] = await getDb().delete(qrTemplates).where(and(eq(qrTemplates.userId, workspaceId), eq(qrTemplates.id, templateId))).returning({ id: qrTemplates.id });
  if (!row) throw new HttpError(404, 'Template not found');
  return { deleted: true };
}
