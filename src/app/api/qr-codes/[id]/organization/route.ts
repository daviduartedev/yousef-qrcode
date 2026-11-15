import { changeCodeOrganization } from '@/server/qr-organization';
import { apiError, privateHeaders, readJson, requireApiUser, requireSameOrigin } from '@/server/http';

export const runtime = 'nodejs';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    const { id } = await params;
    return Response.json(await changeCodeOrganization(user.id, id, await readJson(request)), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
