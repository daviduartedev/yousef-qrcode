import { normalizeQRSearch } from '@/lib/qr-search';
import { apiError, privateHeaders } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { searchCodes } from '@/server/qr-search';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request);
    const query = normalizeQRSearch(new URL(request.url).searchParams.get('q') ?? '');
    return Response.json({ results: await searchCodes(workspace.id, query) }, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
