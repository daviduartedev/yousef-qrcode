import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq, exists, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { assets, cards, forms, linkPages, qrCodes } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import { getServerEnv } from '@/server/env';
import type { LinkedQRKind } from '@/lib/qr-linked';

const signature = (assetId: string) => createHmac('sha256', getServerEnv().secret).update(`public-file:${assetId}`).digest('base64url').slice(0, 32);

/** Permanent public address of a library file, used by file QR codes. It stops working when the file is deleted. */
export const publicFileUrl = (assetId: string) => `${getServerEnv().appUrl}/a/${assetId}/${signature(assetId)}`;

export function validFileSignature(assetId: string, given: string) {
  if (!z.uuid().safeParse(assetId).success || !/^[A-Za-z0-9_-]{32}$/.test(given)) return false;
  const expected = Buffer.from(signature(assetId));
  const actual = Buffer.from(given);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** The file opens only while an active file QR of its workspace points to it; deactivating the codes revokes it. */
export async function publicFile(assetId: string, given: string) {
  if (!validFileSignature(assetId, given)) return null;
  const [row] = await getDb().select({ name: assets.name, mimeType: assets.mimeType, content: assets.content, sha256: assets.sha256 }).from(assets)
    .where(and(eq(assets.id, assetId), exists(getDb().select({ one: sql`1` }).from(qrCodes).where(and(eq(qrCodes.userId, assets.userId), eq(qrCodes.qrType, 'file'),
      eq(qrCodes.isActive, true), sql`${qrCodes.content}->>'id' = ${assetId}`)))));
  return row ?? null;
}

/** Resolves the item a linked QR points to; it must belong to the workspace. Pages, cards and forms must be published. */
export async function linkedDestination(workspaceId: string, kind: LinkedQRKind, id: string) {
  if (!z.uuid().safeParse(id).success) throw new HttpError(400, 'Choose an item for this QR code');
  const origin = getServerEnv().appUrl;
  const db = getDb();
  if (kind === 'file') {
    const [row] = await db.select({ name: assets.name }).from(assets).where(and(eq(assets.userId, workspaceId), eq(assets.id, id)));
    if (!row) throw new HttpError(400, 'Choose a file from your library');
    return { url: publicFileUrl(id), title: row.name };
  }
  const table = kind === 'linkpage' ? linkPages : kind === 'card' ? cards : forms;
  const prefix = kind === 'linkpage' ? 'p' : kind === 'card' ? 'c' : 'f';
  const [row] = await db.select({ slug: table.slug, title: table.title, published: table.isPublished }).from(table).where(and(eq(table.userId, workspaceId), eq(table.id, id)));
  if (!row) throw new HttpError(400, 'Choose an item for this QR code');
  if (!row.published) throw new HttpError(400, 'Publish it first so the QR code opens it');
  return { url: `${origin}/${prefix}/${row.slug}`, title: row.title };
}
