import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { deleteOrganization, renameOrganization } from '@/server/workspaces';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'read');
    return Response.json({ workspace: await renameOrganization(workspace, await readJson(request)) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'read');
    return Response.json(await deleteOrganization(workspace, await readJson(request)), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
