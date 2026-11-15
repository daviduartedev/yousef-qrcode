import { changeCodeOrganization } from '@/server/qr-organization';
import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';

export const runtime = 'nodejs';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    const { id } = await params;
    return Response.json(await changeCodeOrganization(workspace.id, id, await readJson(request)), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
