import { applyBulkLabels } from '@/server/qr-organization';
import { apiError, privateHeaders, readJson, requireApiUser, requireSameOrigin } from '@/server/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    return Response.json(await applyBulkLabels(user.id, await readJson(request)), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
