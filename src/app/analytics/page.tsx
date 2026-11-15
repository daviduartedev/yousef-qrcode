import { requirePageWorkspace } from '@/server/workspace-session';
import { requestedPath } from '@/lib/auth-paths';
import { accountAnalytics } from '@/server/analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';
import Analytics from '@/views/Analytics';

export const runtime = 'nodejs';

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const { workspace } = await requirePageWorkspace(requestedPath('/analytics', raw));
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === 'string') params.set(key, value);
  const today = new Date().toISOString().slice(0, 10);
  return <Analytics data={await accountAnalytics(workspace.id, readAnalyticsQuery(params, today))} today={today} />;
}
