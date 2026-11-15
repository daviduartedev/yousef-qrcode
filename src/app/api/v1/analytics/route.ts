import { publicApi } from '@/server/public-api';
import { accountAnalytics } from '@/server/analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';

export const runtime = 'nodejs';

/** GET /api/v1/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD&qr=<id>&device=&country= — same rules as the app (UTC days). */
export async function GET(request: Request) {
  return publicApi(request, 'analytics:read', async caller => ({ body: await accountAnalytics(caller.workspaceId, readAnalyticsQuery(new URL(request.url).searchParams)) }));
}
