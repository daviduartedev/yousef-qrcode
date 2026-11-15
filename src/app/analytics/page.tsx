import { requirePageSession } from '@/server/session';
import { accountAnalytics } from '@/server/analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';
import Analytics from '@/views/Analytics';

export const runtime = 'nodejs';

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requirePageSession();
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === 'string') params.set(key, value);
  const today = new Date().toISOString().slice(0, 10);
  return <Analytics data={await accountAnalytics(user.id, readAnalyticsQuery(params, today))} today={today} />;
}
