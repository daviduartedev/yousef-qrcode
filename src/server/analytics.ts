import 'server-only';
import { and, asc, desc, eq, gt, gte, lt, sql } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { qrCodes, qrScans } from '@/server/db/schema';
import { getQRCounts, qrRecord } from '@/server/qr-codes';
import { HttpError } from '@/server/http';
import type { QRAnalytics, QRAnalyticsResponse, ScanRecord } from '@/lib/qr-types';
import { lifecycleExpression } from '@/server/lifecycle';
import {
  addDays, csvCell, daysBetween, lifecycleStates,
  type AnalyticsQuery, type AnalyticsResponse, type LifecycleState,
} from '@/lib/qr-analytics';

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
  return { counts, scanHistory, recent, top: top ?? null, lifecycle: await lifecycleCounts(userId) };
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

const scanHour = sql<number>`extract(hour from ${qrScans.scannedAt} AT TIME ZONE 'UTC')::int`;
const dayStart = (day: string) => new Date(day + 'T00:00:00Z');

function scanScope(userId: string, query: AnalyticsQuery, range: { from: string; to: string }) {
  return and(
    eq(qrCodes.userId, userId),
    gte(qrScans.scannedAt, dayStart(range.from)),
    lt(qrScans.scannedAt, dayStart(addDays(range.to, 1))),
    query.qr ? eq(qrCodes.id, query.qr) : undefined,
    query.device ? eq(qrScans.deviceType, query.device) : undefined,
    query.country ? eq(qrScans.country, query.country) : undefined,
  );
}

const summaryColumns = {
  scans: sql<number>`count(*)::int`,
  uniqueScanners: sql<number>`count(distinct (${qrScans.ipAddress}, ${qrScans.userAgent})) filter (where ${qrScans.ipAddress} is not null)::int`,
  scansWithoutAddress: sql<number>`count(*) filter (where ${qrScans.ipAddress} is null)::int`,
};

/** Consolidated scan analytics for the signed-in account. Every boundary is a UTC day. */
export async function accountAnalytics(userId: string, query: AnalyticsQuery): Promise<AnalyticsResponse> {
  const db = getDb();
  const days = daysBetween(query.from, query.to);
  const previous = { from: addDays(query.from, -days), to: addDays(query.from, -1) };
  const current = scanScope(userId, query, query);
  // One read-only snapshot on a single pooled connection, so analytics never starve scan redirects of connections.
  return db.transaction(async (tx) => {
  const scanned = (columns: Parameters<typeof db.select>[0]) =>
    tx.select(columns).from(qrScans).innerJoin(qrCodes, eq(qrScans.qrCodeId, qrCodes.id));
  const group = async (column: typeof qrScans.deviceType | typeof qrScans.os | typeof qrScans.browser | typeof qrScans.country) => Object.fromEntries(
    (await scanned({ key: column, count: sql<number>`count(*)::int` }).where(current).groupBy(column)
      .orderBy(desc(sql`count(*)`))).map(row => [String(row.key ?? 'Unknown'), Number(row.count)]),
  );
  const [[summary], [previousSummary], currentDays, previousDays, byQr, byDevice, byOs, byBrowser, byCountry, hours, codes] = await Promise.all([
    scanned(summaryColumns).where(current),
    scanned(summaryColumns).where(scanScope(userId, query, previous)),
    scanned({ day: scanDay, count: sql<number>`count(*)::int` }).where(current).groupBy(scanDay),
    scanned({ day: scanDay, count: sql<number>`count(*)::int` }).where(scanScope(userId, query, previous)).groupBy(scanDay),
    scanned({ id: qrCodes.id, title: qrCodes.title, count: sql<number>`count(*)::int` }).where(current)
      .groupBy(qrCodes.id, qrCodes.title).orderBy(desc(sql`count(*)`), desc(qrCodes.id)).limit(10),
    group(qrScans.deviceType),
    group(qrScans.os),
    group(qrScans.browser),
    group(qrScans.country),
    scanned({ hour: scanHour, count: sql<number>`count(*)::int` }).where(current).groupBy(scanHour),
    tx.select({ id: qrCodes.id, title: qrCodes.title }).from(qrCodes)
      .where(and(eq(qrCodes.userId, userId), eq(qrCodes.trackingEnabled, true)))
      .orderBy(asc(sql`lower(coalesce(${qrCodes.title}, ''))`), desc(qrCodes.id)).limit(500),
  ]);
  const currentByDay = new Map(currentDays.map(row => [row.day as string, Number(row.count)]));
  const previousByDay = new Map(previousDays.map(row => [row.day as string, Number(row.count)]));
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const row of hours) byHour[Number(row.hour)] = Number(row.count);
  const toSummary = (row: Record<string, unknown> | undefined) => ({
    scans: Number(row?.scans ?? 0), uniqueScanners: Number(row?.uniqueScanners ?? 0), scansWithoutAddress: Number(row?.scansWithoutAddress ?? 0),
  });
  return {
    query,
    previous,
    summary: toSummary(summary),
    previousSummary: toSummary(previousSummary),
    series: Array.from({ length: days }, (_, index) => {
      const day = addDays(query.from, index);
      return { day, scans: currentByDay.get(day) ?? 0, previous: previousByDay.get(addDays(previous.from, index)) ?? 0 };
    }),
    byQr: byQr.map(row => ({ id: row.id as string, title: (row.title as string | null) ?? '', scans: Number(row.count) })),
    byDevice, byOs, byBrowser, byCountry, byHour,
    codes: codes.map(code => ({ id: code.id, title: code.title ?? '' })),
  };
  }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
}

/** Daily rows per QR for spreadsheet export; cells are neutralized against formula execution. */
export async function analyticsCsv(userId: string, query: AnalyticsQuery) {
  const rows = await getDb().select({
    day: scanDay, title: qrCodes.title, shortCode: qrCodes.shortCode,
    ...summaryColumns,
  }).from(qrScans).innerJoin(qrCodes, eq(qrScans.qrCodeId, qrCodes.id))
    .where(scanScope(userId, query, query))
    .groupBy(scanDay, qrCodes.id, qrCodes.title, qrCodes.shortCode)
    .orderBy(asc(scanDay), asc(sql`lower(coalesce(${qrCodes.title}, ''))`), asc(qrCodes.shortCode));
  const header = ['date_utc', 'qr_name', 'short_code', 'scans', 'unique_scanners', 'scans_without_address'];
  return [header.join(','), ...rows.map(row => [row.day, row.title ?? '', row.shortCode, row.scans, row.uniqueScanners, row.scansWithoutAddress]
    .map(value => csvCell(value as string | number)).join(','))].join('\r\n') + '\r\n';
}

export async function lifecycleCounts(userId: string) {
  const rows = await getDb().select({ state: lifecycleExpression, count: sql<number>`count(*)::int` })
    .from(qrCodes).where(and(eq(qrCodes.userId, userId), eq(qrCodes.trackingEnabled, true)))
    .groupBy(sql`1`);
  const counts = Object.fromEntries(lifecycleStates.map(state => [state, 0])) as Record<LifecycleState, number>;
  for (const row of rows) if (row.state) counts[row.state] = Number(row.count);
  return counts;
}
