import { changeCollection, listOrganization } from '@/server/qr-organization';
import { apiError, privateHeaders, readJson, requireApiUser, requireSameOrigin } from '@/server/http';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return Response.json(await listOrganization(user.id), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    return Response.json(await changeCollection(user.id, await readJson(request)), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
