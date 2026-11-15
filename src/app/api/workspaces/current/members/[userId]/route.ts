import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { changeMemberRole, removeMember } from '@/server/workspaces';

export const runtime = 'nodejs';

type Context = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'read');
    return Response.json(await changeMemberRole(workspace, (await context.params).userId, await readJson(request)), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

/** Removes a member, or leaves the organization when the id is the signed-in account. */
export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'read');
    return Response.json(await removeMember(workspace, (await context.params).userId), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
