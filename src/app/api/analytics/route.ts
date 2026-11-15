import { accountAnalytics } from '@/server/analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';
import { apiError, privateHeaders } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request);
    const query = readAnalyticsQuery(new URL(request.url).searchParams);
    return Response.json(await accountAnalytics(workspace.id, query), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
