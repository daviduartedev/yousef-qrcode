import 'server-only';

import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import type { QRSearchResult } from '@/lib/qr-search';
import { getDb } from '@/server/db';
import { qrCodes } from '@/server/db/schema';
import { describeQRDestination } from '@/lib/qr-content';

export async function searchCodes(userId: string, query: string): Promise<QRSearchResult[]> {
  if (!query) return [];

  const literal = query.replace(/[\\%_]/g, '\\$&');
  const contains = '%' + literal + '%';
  const rows = await getDb().select({
    id: qrCodes.id,
    title: qrCodes.title,
    destination_url: qrCodes.destinationUrl,
    qr_type: qrCodes.qrType,
    content: qrCodes.content,
  }).from(qrCodes)
    .where(and(eq(qrCodes.userId, userId), or(ilike(qrCodes.title, contains), and(ne(qrCodes.qrType, 'wifi'), ilike(qrCodes.destinationUrl, contains)))))
    .orderBy(sql`case
      when ${ilike(qrCodes.title, literal)} then 0
      when ${ilike(qrCodes.title, literal + '%')} then 1
      when ${ilike(qrCodes.title, contains)} then 2
      else 3
    end`, desc(qrCodes.updatedAt), desc(qrCodes.id))
    .limit(8);
  return rows.map(row => ({ id: row.id, title: row.title, destination_url: describeQRDestination(row) }));
}
