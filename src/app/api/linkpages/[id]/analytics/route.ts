import { apiError, privateHeaders, requireApiUser } from '@/server/http';
import { linkpageAnalytics } from '@/server/linkpage-analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';

export const runtime = 'nodejs';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request);
    const query = readAnalyticsQuery(new URL(request.url).searchParams);
    return Response.json(await linkpageAnalytics(user.id, (await context.params).id, query), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
