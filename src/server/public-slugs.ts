import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { publicSlugs } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import type { getDb } from '@/server/db';

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];
export type SlugKind = 'linkpage' | 'card' | 'form';

/**
 * Reserves a public address for an account. Addresses are never released to another account,
 * even after a rename or deletion, so a QR code that was printed with an old address cannot be taken over.
 */
export async function claimSlug(tx: Tx, kind: SlugKind, slug: string, userId: string) {
  await tx.insert(publicSlugs).values({ kind, slug, userId }).onConflictDoNothing();
  const [row] = await tx.select({ userId: publicSlugs.userId }).from(publicSlugs)
    .where(and(eq(publicSlugs.kind, kind), eq(publicSlugs.slug, slug)));
  if (row?.userId !== userId) throw new HttpError(409, 'This address is already taken');
}

export async function slugFree(tx: Tx, kind: SlugKind, slug: string, userId: string) {
  const { rows } = await tx.execute<{ owner: string }>(sql`select user_id as owner from qrconnect.public_slugs where kind = ${kind} and slug = ${slug}`);
  return !rows[0] || rows[0].owner === userId;
}
