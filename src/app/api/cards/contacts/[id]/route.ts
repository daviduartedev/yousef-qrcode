import { apiError, privateHeaders, requireApiUser, requireSameOrigin } from '@/server/http';
import { deleteCardContact } from '@/server/cards';

export const runtime = 'nodejs';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    return Response.json(await deleteCardContact(user.id, (await context.params).id), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
