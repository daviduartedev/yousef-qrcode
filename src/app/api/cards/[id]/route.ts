import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { deleteCard, getCard, updateCard } from '@/server/cards';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

// Card drafts are small; the limit leaves room for long Arabic text.
const draftLimit = 64 * 1024;

export async function GET(request: Request, context: Context) {
  try {
    const workspace = await requireApiWorkspace(request);
    return Response.json({ card: await getCard(workspace.id, (await context.params).id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json({ card: await updateCard(workspace.id, (await context.params).id, await readJson(request, draftLimit)) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json(await deleteCard(workspace.id, (await context.params).id), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
