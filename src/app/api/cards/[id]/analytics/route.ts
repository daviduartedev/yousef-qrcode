import { apiError, privateHeaders } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { cardAnalytics } from '@/server/card-analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const workspace = await requireApiWorkspace(request);
    const query = readAnalyticsQuery(new URL(request.url).searchParams);
    return Response.json(await cardAnalytics(workspace.id, (await context.params).id, query), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
