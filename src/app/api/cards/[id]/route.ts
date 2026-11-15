import { apiError, privateHeaders, readJson, requireApiUser, requireSameOrigin } from '@/server/http';
import { deleteCard, getCard, updateCard } from '@/server/cards';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

// Card drafts are small; the limit leaves room for long Arabic text.
const draftLimit = 64 * 1024;

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireApiUser(request);
    return Response.json({ card: await getCard(user.id, (await context.params).id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    return Response.json({ card: await updateCard(user.id, (await context.params).id, await readJson(request, draftLimit)) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    return Response.json(await deleteCard(user.id, (await context.params).id), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
