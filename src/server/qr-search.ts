import 'server-only';

import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { QRSearchResult } from '@/lib/qr-search';
import { getDb } from '@/server/db';
import { qrCodes } from '@/server/db/schema';

export async function searchCodes(userId: string, query: string): Promise<QRSearchResult[]> {
  if (!query) return [];

  const literal = query.replace(/[\\%_]/g, '\\$&');
  const contains = '%' + literal + '%';
  return getDb().select({
    id: qrCodes.id,
    title: qrCodes.title,
    destination_url: qrCodes.destinationUrl,
  }).from(qrCodes)
    .where(and(eq(qrCodes.userId, userId), or(ilike(qrCodes.title, contains), ilike(qrCodes.destinationUrl, contains))))
    .orderBy(sql`case
      when ${ilike(qrCodes.title, literal)} then 0
      when ${ilike(qrCodes.title, literal + '%')} then 1
      when ${ilike(qrCodes.title, contains)} then 2
      else 3
    end`, desc(qrCodes.updatedAt), desc(qrCodes.id))
    .limit(8);
}
