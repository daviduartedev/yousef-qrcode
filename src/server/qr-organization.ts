import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { qrCodeLabels, qrCodes, qrFolders, qrLabels } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import { qrBulkLabelLimit, qrPageSize } from '@/lib/qr-list';

const collection = z.enum(['folder', 'label']);
const id = z.uuid();
const name = z.string().trim().min(1).refine(value => Array.from(value).length <= 80 && !/[\u0000-\u001f\u007f]/.test(value));
const collectionInput = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), collection, name }).strict(),
  z.object({ action: z.literal('rename'), collection, id, name }).strict(),
  z.object({ action: z.literal('delete'), collection, id }).strict(),
]);

export async function listOrganization(userId: string) {
  const db = getDb();
  return db.transaction(async tx => {
    const folders = await tx.select({ id: qrFolders.id, name: qrFolders.name }).from(qrFolders)
      .where(eq(qrFolders.userId, userId)).orderBy(asc(qrFolders.name), asc(qrFolders.id));
    const labels = await tx.select({ id: qrLabels.id, name: qrLabels.name }).from(qrLabels)
      .where(eq(qrLabels.userId, userId)).orderBy(asc(qrLabels.name), asc(qrLabels.id));
    return { folders, labels };
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
}

export async function changeCollection(userId: string, input: unknown) {
  const parsed = collectionInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Invalid collection details');
  const data = parsed.data;
  const table = data.collection === 'folder' ? qrFolders : qrLabels;
  const columns = { id: table.id, name: table.name };
  const db = getDb();

  if (data.action === 'create') {
    const [created] = await db.insert(table).values({ userId, name: data.name })
      .onConflictDoNothing().returning(columns);
    if (!created) throw new HttpError(409, 'This name is already in use');
    return created;
  }

  const own = and(eq(table.id, data.id), eq(table.userId, userId));
  if (data.action === 'delete') {
    const [deleted] = await db.delete(table).where(own).returning(columns);
    if (!deleted) throw new HttpError(404, 'Collection not found');
    return deleted;
  }

  try {
    const [updated] = await db.update(table).set({ name: data.name }).where(own).returning(columns);
    if (!updated) throw new HttpError(404, 'Collection not found');
    return updated;
  } catch (error) {
    if ((error as { cause?: { code?: string } })?.cause?.code === '23505') {
      throw new HttpError(409, 'This name is already in use');
    }
    throw error;
  }
}

const organizationInput = z.union([
  z.object({ folderId: id.nullable() }).strict(),
  z.object({ watched: z.boolean() }).strict(),
  z.object({ labelId: id, labeled: z.boolean() }).strict(),
]);

export async function changeCodeOrganization(userId: string, codeId: string, input: unknown) {
  if (!id.safeParse(codeId).success) throw new HttpError(404, 'QR Code not found');
  const parsed = organizationInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Invalid organization details');
  const data = parsed.data;
  return getDb().transaction(async tx => {
    if ('folderId' in data && data.folderId) {
      const [folder] = await tx.select({ id: qrFolders.id }).from(qrFolders)
        .where(and(eq(qrFolders.userId, userId), eq(qrFolders.id, data.folderId))).for('key share');
      if (!folder) throw new HttpError(404, 'Folder not found');
    }
    const ownsCode = and(eq(qrCodes.userId, userId), eq(qrCodes.id, codeId));
    const [code] = await tx.select({ id: qrCodes.id, tracked: qrCodes.trackingEnabled }).from(qrCodes).where(ownsCode).for('update');
    if (!code) throw new HttpError(404, 'QR Code not found');

    if ('folderId' in data) {
      await tx.update(qrCodes).set({ folderId: data.folderId, updatedAt: new Date() }).where(ownsCode);
    } else if ('watched' in data) {
      if (!code.tracked) throw new HttpError(400, 'Only tracked QR Codes can be watched');
      await tx.update(qrCodes).set({ watched: data.watched, updatedAt: new Date() }).where(ownsCode);
    } else {
      const [label] = await tx.select({ id: qrLabels.id }).from(qrLabels)
        .where(and(eq(qrLabels.userId, userId), eq(qrLabels.id, data.labelId))).for('key share');
      if (!label) throw new HttpError(404, 'Label not found');
      if (data.labeled) {
        await tx.insert(qrCodeLabels).values({ userId, qrCodeId: codeId, labelId: data.labelId }).onConflictDoNothing();
      } else {
        await tx.delete(qrCodeLabels).where(and(eq(qrCodeLabels.userId, userId),
          eq(qrCodeLabels.qrCodeId, codeId), eq(qrCodeLabels.labelId, data.labelId)));
      }
    }
    return { updated: true };
  });
}

const bulkInput = z.object({ ids: z.array(id).min(1).max(qrPageSize), labelIds: z.array(id).min(1).max(qrBulkLabelLimit) }).strict();

export async function applyBulkLabels(userId: string, input: unknown) {
  const parsed = bulkInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Invalid bulk selection');
  const ids = [...new Set(parsed.data.ids.map(value => value.toLowerCase()))];
  const labelIds = [...new Set(parsed.data.labelIds.map(value => value.toLowerCase()))];
  return getDb().transaction(async tx => {
    const codes = await tx.select({ id: qrCodes.id }).from(qrCodes)
      .where(and(eq(qrCodes.userId, userId), inArray(qrCodes.id, ids))).orderBy(qrCodes.id).for('key share');
    const labels = await tx.select({ id: qrLabels.id }).from(qrLabels)
      .where(and(eq(qrLabels.userId, userId), inArray(qrLabels.id, labelIds))).orderBy(qrLabels.id).for('key share');
    if (labels.length !== labelIds.length) throw new HttpError(404, 'Label not found');
    const owned = new Set(codes.map(code => code.id));
    if (codes.length) await tx.insert(qrCodeLabels).values(codes.flatMap(code =>
      labels.map(label => ({ userId, qrCodeId: code.id, labelId: label.id })))).onConflictDoNothing();
    return { results: ids.map(id => ({ id, status: owned.has(id) ? 'updated' : 'not_found' })) };
  });
}
