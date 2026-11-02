import { deleteCode } from '@/server/qr-codes';
import { requireApiUser, requireSameOrigin, apiError, privateHeaders } from '@/server/http';
export const runtime = 'nodejs';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    return Response.json(await deleteCode(user.id, (await context.params).id), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
