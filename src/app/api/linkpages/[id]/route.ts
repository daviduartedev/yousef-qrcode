import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { deleteLinkpage, getLinkpage, updateLinkpage } from '@/server/linkpages';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

// Drafts can hold 40 blocks, so the body limit is larger than the default.
const draftLimit = 64 * 1024;

export async function GET(request: Request, context: Context) {
  try {
    const workspace = await requireApiWorkspace(request);
    return Response.json({ linkpage: await getLinkpage(workspace.id, (await context.params).id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json({ linkpage: await updateLinkpage(workspace.id, (await context.params).id, await readJson(request, draftLimit)) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json(await deleteLinkpage(workspace.id, (await context.params).id), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
