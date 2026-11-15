import { apiError, privateHeaders, requireApiUser, requireSameOrigin } from '@/server/http';
import { deleteFormResponse } from '@/server/forms';

export const runtime = 'nodejs';

export async function DELETE(request: Request, context: { params: Promise<{ id: string; responseId: string }> }) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    const { id, responseId } = await context.params;
    return Response.json(await deleteFormResponse(user.id, id, responseId), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
