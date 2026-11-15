import { apiError, privateHeaders } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { cardAnalytics, cardAnalyticsCsv } from '@/server/card-analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const workspace = await requireApiWorkspace(request);
    const query = readAnalyticsQuery(new URL(request.url).searchParams);
    const data = await cardAnalytics(workspace.id, (await context.params).id, query);
    return new Response(cardAnalyticsCsv(data), { headers: { ...privateHeaders, 'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="card-${data.card.slug}-${query.from}-${query.to}.csv"` } });
  } catch (error) { return apiError(error); }
}
