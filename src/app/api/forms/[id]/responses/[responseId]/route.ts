import { apiError, privateHeaders, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { deleteFormResponse } from '@/server/forms';

export const runtime = 'nodejs';

export async function DELETE(request: Request, context: { params: Promise<{ id: string; responseId: string }> }) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    const { id, responseId } = await context.params;
    return Response.json(await deleteFormResponse(workspace.id, id, responseId), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
