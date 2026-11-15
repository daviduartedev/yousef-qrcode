import 'server-only';
import { sql } from 'drizzle-orm';
import { qrCodes, qrScans } from '@/server/db/schema';
import { lifecycleRules as rules, type LifecycleState } from '@/lib/qr-analytics';

const recentScan = sql`exists (select 1 from ${qrScans} lifecycle_scan
  where lifecycle_scan.qr_code_id = ${qrCodes.id}
    and lifecycle_scan.scanned_at >= now() - make_interval(days => ${rules.quietDays}))`;

/** One pass over the last two trend windows: earlier window busy enough and the latest below the ratio. */
const declining = sql`(select count(*) filter (where scanned_at < now() - make_interval(days => ${rules.trendDays})) >= ${rules.trendMinimum}
    and count(*) filter (where scanned_at >= now() - make_interval(days => ${rules.trendDays}))
      < count(*) filter (where scanned_at < now() - make_interval(days => ${rules.trendDays})) * ${rules.trendRatio}::numeric
  from ${qrScans} trend_scan
  where trend_scan.qr_code_id = ${qrCodes.id}
    and trend_scan.scanned_at >= now() - make_interval(days => ${rules.trendDays * 2}))`;

/**
 * Lifecycle of a tracked QR code; null for direct and static codes, which have no scan data.
 * Mirrors lifecycleOf() in src/lib/qr-analytics.ts.
 */
export const lifecycleExpression = sql<LifecycleState | null>`case
  when not ${qrCodes.trackingEnabled} then null
  when not ${qrCodes.isActive} then 'paused'
  when ${qrCodes.createdAt} > now() - make_interval(days => ${rules.newDays}) then 'new'
  when not ${recentScan} then 'no_scans'
  when ${declining} then 'declining'
  else 'active'
end`;
