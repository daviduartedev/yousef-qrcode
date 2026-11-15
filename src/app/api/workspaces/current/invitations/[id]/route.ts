import { apiError, privateHeaders, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { revokeInvitation } from '@/server/workspaces';

export const runtime = 'nodejs';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'read');
    return Response.json(await revokeInvitation(workspace, (await context.params).id), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
