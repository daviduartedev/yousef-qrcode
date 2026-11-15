import { apiError, privateHeaders } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { linkpageAnalytics, linkpageAnalyticsCsv } from '@/server/linkpage-analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const workspace = await requireApiWorkspace(request);
    const query = readAnalyticsQuery(new URL(request.url).searchParams);
    const data = await linkpageAnalytics(workspace.id, (await context.params).id, query);
    return new Response(linkpageAnalyticsCsv(data), { headers: { ...privateHeaders, 'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="linkpage-${data.page.slug}-${query.from}-${query.to}.csv"` } });
  } catch (error) { return apiError(error); }
}
