import { accountAnalytics } from '@/server/analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';
import { apiError, privateHeaders, requireApiUser } from '@/server/http';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const query = readAnalyticsQuery(new URL(request.url).searchParams);
    return Response.json(await accountAnalytics(user.id, query), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
