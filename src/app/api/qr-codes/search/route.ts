import { normalizeQRSearch } from '@/lib/qr-search';
import { apiError, privateHeaders, requireApiUser } from '@/server/http';
import { searchCodes } from '@/server/qr-search';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const query = normalizeQRSearch(new URL(request.url).searchParams.get('q') ?? '');
    return Response.json({ results: await searchCodes(user.id, query) }, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
