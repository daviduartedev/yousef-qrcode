import { apiError, privateHeaders, requireApiUser } from '@/server/http';
import { linkpageAnalytics, linkpageAnalyticsCsv } from '@/server/linkpage-analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const query = readAnalyticsQuery(new URL(request.url).searchParams);
    const data = await linkpageAnalytics(user.id, (await context.params).id, query);
    return new Response(linkpageAnalyticsCsv(data), { headers: { ...privateHeaders, 'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="linkpage-${data.page.slug}-${query.from}-${query.to}.csv"` } });
  } catch (error) { return apiError(error); }
}
