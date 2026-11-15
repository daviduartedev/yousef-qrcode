import 'server-only';
import { and, desc, eq, gt, gte, lt, sql } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { qrCodes, qrScans } from '@/server/db/schema';
import { getQRCounts, qrRecord } from '@/server/qr-codes';
import { HttpError } from '@/server/http';
import type { QRAnalytics, QRAnalyticsResponse, ScanRecord } from '@/lib/qr-types';

const scanDay = sql<string>`to_char(${qrScans.scannedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;
const dayMs = 86_400_000;

export async function getQROverview(userId: string) {
  const db = getDb();
  const end = new Date();
  end.setUTCHours(24, 0, 0, 0);
  const start = new Date(end.getTime() - 60 * dayMs);
  const owner = eq(qrCodes.userId, userId);
  const row = {
    id: qrCodes.id,
    title: qrCodes.title,
    destination: sql<string>`case when ${qrCodes.qrType} = 'wifi' then 'Wi-Fi · ' || (${qrCodes.content}->>'ssid') else ${qrCodes.destinationUrl} end`,
    tracked: qrCodes.trackingEnabled,
    active: qrCodes.isActive,
    scans: qrCodes.totalScans,
  };
  const [counts, days, recent, [top]] = await Promise.all([
    getQRCounts(userId),
    db.select({ day: scanDay, scans: sql<number>`count(*)`.mapWith(Number) })
      .from(qrCodes).innerJoin(qrScans, eq(qrScans.qrCodeId, qrCodes.id))
      .where(and(owner, eq(qrCodes.trackingEnabled, true), gte(qrScans.scannedAt, start), lt(qrScans.scannedAt, end)))
      .groupBy(scanDay),
    db.select(row).from(qrCodes).where(owner)
      .orderBy(desc(qrCodes.createdAt), desc(qrCodes.id)).limit(4),
    db.select(row).from(qrCodes)
      .where(and(owner, eq(qrCodes.trackingEnabled, true), gt(qrCodes.totalScans, 0)))
      .orderBy(desc(qrCodes.totalScans), desc(qrCodes.createdAt), desc(qrCodes.id)).limit(1),
  ]);
  const byDay = new Map(days.map(day => [day.day, day.scans]));
  const scanHistory = Array.from({ length: 60 }, (_, index) => {
    const day = new Date(start.getTime() + index * dayMs).toISOString().slice(0, 10);
    return { day, scans: byDay.get(day) ?? 0 };
  });
  return { counts, scanHistory, recent, top: top ?? null };
}

export async function codeAnalytics(userId: string, shortCode: string): Promise<QRAnalyticsResponse> {
  const [qr] = await getDb().select().from(qrCodes).where(and(eq(qrCodes.userId, userId), eq(qrCodes.shortCode, shortCode)));
  if (!qr) throw new HttpError(404, 'QR code not found');
  const day = scanDay;
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
