import 'server-only';
import { createHash } from 'node:crypto';
import { and, asc, count, desc, eq, ilike, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { assetFolders, assets } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import {
  assetKinds, assetLimits, assetMimeTypes, cleanAssetName, imageDimensions, sniffAssetType,
  type AssetFolder, type AssetPage, type AssetRecord, type AssetUsage,
} from '@/lib/assets';

const id = z.uuid();
const folderName = z.string().trim().min(1).refine(value => Array.from(value).length <= 80 && !/[\u0000-\u001f\u007f]/.test(value));

// Raw qualified names: interpolated Drizzle columns render unqualified and would bind to the subquery table.
const usesExpression = sql<number>`(select count(*)::int from qrconnect.qr_codes q
  where q.user_id = "assets"."user_id" and q.design->>'logoAssetId' = "assets"."id"::text)`;

const recordColumns = {
  id: assets.id, name: assets.name, kind: assets.kind, mime_type: assets.mimeType, size_bytes: assets.sizeBytes,
  width: assets.width, height: assets.height, folder_id: assets.folderId, created_at: assets.createdAt, updated_at: assets.updatedAt,
  qr_uses: usesExpression,
};

function toRecord(row: { created_at: Date; updated_at: Date; kind: string; mime_type: string } & Omit<AssetRecord, 'created_at' | 'updated_at' | 'kind' | 'mime_type'>): AssetRecord {
  return { ...row, created_at: row.created_at.toISOString(), updated_at: row.updated_at.toISOString() } as AssetRecord;
}

async function usage(tx: Pick<ReturnType<typeof getDb>, 'select'>, userId: string): Promise<AssetUsage> {
  const [row] = await tx.select({ bytes: sql<number>`coalesce(sum(${assets.sizeBytes}), 0)::bigint`, files: count() })
    .from(assets).where(eq(assets.userId, userId));
  return { bytes: Number(row.bytes), files: row.files, maxBytes: assetLimits.maxAccountBytes, maxFiles: assetLimits.maxAccountFiles };
}

async function folders(tx: Pick<ReturnType<typeof getDb>, 'select'>, userId: string): Promise<AssetFolder[]> {
  return tx.select({ id: assetFolders.id, name: assetFolders.name, files: sql<number>`(select count(*)::int from qrconnect.assets a where a.user_id = "asset_folders"."user_id" and a.folder_id = "asset_folders"."id")` })
    .from(assetFolders).where(eq(assetFolders.userId, userId)).orderBy(asc(assetFolders.name), asc(assetFolders.id));
}

export type AssetQuery = { q: string; kind: (typeof assetKinds)[number] | null; folder: string | 'none' | null; page: number };

export function readAssetQuery(params: URLSearchParams): AssetQuery {
  const kind = params.get('kind');
  const folder = params.get('folder');
  const page = Number(params.get('page'));
  return {
    q: (params.get('q') ?? '').trim().slice(0, 120),
    kind: assetKinds.includes(kind as never) ? kind as AssetQuery['kind'] : null,
    folder: folder === 'none' ? 'none' : id.safeParse(folder).success ? folder : null,
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 10000) : 1,
  };
}

export async function listAssets(userId: string, query: AssetQuery): Promise<AssetPage> {
  return getDb().transaction(async tx => {
    const escaped = query.q.replace(/[\\%_]/g, character => '\\' + character);
    const where = and(
      eq(assets.userId, userId),
      query.q ? ilike(assets.name, `%${escaped}%`) : undefined,
      query.kind ? eq(assets.kind, query.kind) : undefined,
      query.folder === 'none' ? isNull(assets.folderId) : query.folder ? eq(assets.folderId, query.folder) : undefined,
    );
    const [{ total }] = await tx.select({ total: count() }).from(assets).where(where);
    const pageCount = Math.max(1, Math.ceil(total / assetLimits.pageSize));
    const page = Math.min(query.page, pageCount);
    const rows = await tx.select(recordColumns).from(assets).where(where)
      .orderBy(desc(assets.createdAt), desc(assets.id)).limit(assetLimits.pageSize).offset((page - 1) * assetLimits.pageSize);
    return { items: rows.map(toRecord), total, page, pageCount, usage: await usage(tx, userId), folders: await folders(tx, userId) };
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
}

async function ownedFolder(tx: Pick<ReturnType<typeof getDb>, 'select'>, userId: string, folderId: string | null) {
  if (!folderId) return null;
  if (!id.safeParse(folderId).success) throw new HttpError(400, 'Invalid folder');
  // The key-share lock keeps the folder from being deleted until this write commits.
  const [row] = await tx.select({ id: assetFolders.id }).from(assetFolders).where(and(eq(assetFolders.userId, userId), eq(assetFolders.id, folderId))).for('key share');
  if (!row) throw new HttpError(404, 'Folder not found');
  return row.id;
}

/** Reads one multipart upload, checks its real type, size and the account quota, then stores it. */
export async function uploadAsset(userId: string, request: Request) {
  const header = request.headers.get('content-length') ?? '';
  const declared = /^\d{1,10}$/.test(header) ? Number(header) : 0;
  if (!declared) throw new HttpError(411, 'Upload size is required');
  if (declared > assetLimits.maxFileBytes + 64 * 1024) throw new HttpError(413, 'File is larger than 4 MB');
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data')) throw new HttpError(415, 'Multipart upload required');
  let form: FormData;
  try { form = await request.formData(); } catch { throw new HttpError(400, 'Invalid upload'); }
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'Choose a file to upload');
  if (file.size === 0) throw new HttpError(400, 'The file is empty');
  if (file.size > assetLimits.maxFileBytes) throw new HttpError(413, 'File is larger than 4 MB');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffAssetType(bytes);
  if (!mimeType) throw new HttpError(415, 'Only PNG, JPEG, WebP, GIF and PDF files are accepted');
  const kind = assetMimeTypes[mimeType].kind;
  const dimensions = kind === 'image' ? imageDimensions(bytes, mimeType) : null;
  // At most 10,000 px per side and 25 megapixels, so previews and exports stay within browser memory.
  if (kind === 'image' && (!dimensions || dimensions.width < 1 || dimensions.height < 1 || dimensions.width > 10000 || dimensions.height > 10000
    || dimensions.width * dimensions.height > 25_000_000)) {
    throw new HttpError(415, 'The image could not be read');
  }
  const rawName = typeof form.get('name') === 'string' && form.get('name') ? String(form.get('name')) : file.name;
  const name = cleanAssetName(rawName) ?? `file.${assetMimeTypes[mimeType].extension}`;
  const folderValue = form.get('folder_id');
  const sha256 = createHash('sha256').update(bytes).digest('hex');

  return getDb().transaction(async tx => {
    // Serialize uploads of one account so concurrent requests cannot exceed the quota together.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'assets:' + userId}))`);
    const folderId = await ownedFolder(tx, userId, typeof folderValue === 'string' && folderValue ? folderValue : null);
    const current = await usage(tx, userId);
    if (current.files >= assetLimits.maxAccountFiles) throw new HttpError(409, 'The library is full. Delete files to upload more.');
    if (current.bytes + bytes.byteLength > assetLimits.maxAccountBytes) throw new HttpError(409, 'Not enough library space. Delete files to upload more.');
    const [row] = await tx.insert(assets).values({
      userId, folderId, name, kind, mimeType, sizeBytes: bytes.byteLength, width: dimensions?.width ?? null, height: dimensions?.height ?? null,
      sha256, content: Buffer.from(bytes),
    }).returning({ id: assets.id });
    const [record] = await tx.select(recordColumns).from(assets).where(eq(assets.id, row.id));
    return toRecord(record);
  });
}

const updateInput = z.object({
  name: z.string().optional(),
  folder_id: z.union([z.uuid(), z.null()]).optional(),
}).strict().refine(value => value.name !== undefined || value.folder_id !== undefined);

export async function updateAsset(userId: string, assetId: string, input: unknown) {
  if (!id.safeParse(assetId).success) throw new HttpError(404, 'File not found');
  const parsed = updateInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Invalid file changes');
  const name = parsed.data.name === undefined ? undefined : cleanAssetName(parsed.data.name);
  if (name === null) throw new HttpError(400, 'Enter a file name');
  return getDb().transaction(async tx => {
    const folderId = parsed.data.folder_id === undefined ? undefined : await ownedFolder(tx, userId, parsed.data.folder_id);
    const [row] = await tx.update(assets).set({
      ...(name !== undefined ? { name } : {}), ...(folderId !== undefined ? { folderId } : {}), updatedAt: new Date(),
    }).where(and(eq(assets.userId, userId), eq(assets.id, assetId))).returning({ id: assets.id });
    if (!row) throw new HttpError(404, 'File not found');
    const [record] = await tx.select(recordColumns).from(assets).where(eq(assets.id, row.id));
    return toRecord(record);
  });
}

/** Deleting a file removes it from QR designs that used it as a logo; printed codes are unaffected. */
export async function deleteAsset(userId: string, assetId: string) {
  if (!id.safeParse(assetId).success) throw new HttpError(404, 'File not found');
  return getDb().transaction(async tx => {
    const [row] = await tx.delete(assets).where(and(eq(assets.userId, userId), eq(assets.id, assetId))).returning({ id: assets.id });
    if (!row) throw new HttpError(404, 'File not found');
    const cleared = await tx.execute(sql`update qrconnect.qr_codes set design = design - 'logoAssetId', updated_at = now()
      where user_id = ${userId} and design->>'logoAssetId' = ${assetId}`);
    return { deleted: true, qr_codes_updated: cleared.rowCount ?? 0 };
  });
}

export async function readAssetFile(userId: string, assetId: string) {
  if (!id.safeParse(assetId).success) return null;
  const [row] = await getDb().select({ name: assets.name, mimeType: assets.mimeType, content: assets.content, sha256: assets.sha256 })
    .from(assets).where(and(eq(assets.userId, userId), eq(assets.id, assetId)));
  return row ?? null;
}

/** Image assets the account may use as a QR logo. */
export async function ownsImageAsset(userId: string, assetId: string) {
  if (!id.safeParse(assetId).success) return false;
  const [row] = await getDb().select({ id: assets.id }).from(assets)
    .where(and(eq(assets.userId, userId), eq(assets.id, assetId), eq(assets.kind, 'image')));
  return Boolean(row);
}

const folderInput = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), name: folderName }).strict(),
  z.object({ action: z.literal('rename'), id, name: folderName }).strict(),
  z.object({ action: z.literal('delete'), id }).strict(),
]);

/** Folder changes; deleting a folder keeps its files in the library root. */
export async function changeAssetFolder(userId: string, input: unknown) {
  const parsed = folderInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Invalid folder');
  const value = parsed.data;
  return getDb().transaction(async tx => {
    try {
      if (value.action === 'create') {
        const [{ total }] = await tx.select({ total: count() }).from(assetFolders).where(eq(assetFolders.userId, userId));
        if (total >= 100) throw new HttpError(409, 'Folder limit reached');
        await tx.insert(assetFolders).values({ userId, name: value.name });
      } else if (value.action === 'rename') {
        const [row] = await tx.update(assetFolders).set({ name: value.name })
          .where(and(eq(assetFolders.userId, userId), eq(assetFolders.id, value.id))).returning({ id: assetFolders.id });
        if (!row) throw new HttpError(404, 'Folder not found');
      } else {
        await tx.update(assets).set({ folderId: null }).where(and(eq(assets.userId, userId), eq(assets.folderId, value.id)));
        const [row] = await tx.delete(assetFolders).where(and(eq(assetFolders.userId, userId), eq(assetFolders.id, value.id))).returning({ id: assetFolders.id });
        if (!row) throw new HttpError(404, 'Folder not found');
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if ((error as { cause?: { code?: string } }).cause?.code === '23505' || (error as { code?: string }).code === '23505') throw new HttpError(409, 'A folder with this name already exists');
      throw error;
    }
    return folders(tx, userId);
  });
}
