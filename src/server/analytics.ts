import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { qrCodes, qrScans } from '@/server/db/schema';
import { qrRecord } from '@/server/qr-codes';
import { HttpError } from '@/server/http';
import type { QRAnalytics, QRAnalyticsResponse, ScanRecord } from '@/lib/qr-types';

export async function codeAnalytics(userId: string, shortCode: string): Promise<QRAnalyticsResponse> {
  const [qr] = await getDb().select().from(qrCodes).where(and(eq(qrCodes.userId, userId), eq(qrCodes.shortCode, shortCode)));
  if (!qr) throw new HttpError(404, 'QR code not found');
  const day = sql<string>`to_char(${qrScans.scannedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;
  const [groups, recent] = await Promise.all([
    getDb().select({
      device: qrScans.deviceType, os: qrScans.os, browser: qrScans.browser, country: qrScans.country,
      day, count: sql<number>`count(*)::int`,
    }).from(qrScans).where(eq(qrScans.qrCodeId, qr.id))
      .groupBy(qrScans.deviceType, qrScans.os, qrScans.browser, qrScans.country, day),
    getDb().select().from(qrScans).where(eq(qrScans.qrCodeId, qr.id)).orderBy(desc(qrScans.scannedAt)).limit(10),
  ]);
  const scans: ScanRecord[] = recent.map(scan => ({
    id: scan.id, scanned_at: scan.scannedAt.toISOString(), device_type: scan.deviceType,
    os: scan.os, browser: scan.browser, country: scan.country, city: scan.city,
  }));
  const analytics: QRAnalytics = { totalScans: 0, uniqueCountries: [], deviceBreakdown: {}, osBreakdown: {}, browserBreakdown: {}, countryBreakdown: {}, scansByDay: {}, recentScans: scans };
  const add = (group: Record<string, number>, key: string | null, count: number) => { const name = key || 'Unknown'; group[name] = (group[name] || 0) + count; };
  for (const group of groups) {
    analytics.totalScans += group.count;
    add(analytics.deviceBreakdown, group.device, group.count);
    add(analytics.osBreakdown, group.os, group.count);
    add(analytics.browserBreakdown, group.browser, group.count);
    add(analytics.countryBreakdown, group.country, group.count);
    add(analytics.scansByDay, group.day, group.count);
  }
  analytics.uniqueCountries = Object.keys(analytics.countryBreakdown).filter(country => country !== 'Unknown');
  return { qrCode: qrRecord(qr), scans, analytics };
}
