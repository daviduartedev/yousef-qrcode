import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { createLinkpage, listLinkpages } from '@/server/linkpages';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request);
    return Response.json({ linkpages: await listLinkpages(workspace.id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    const result = await createLinkpage(workspace.id, await readJson(request));
    return Response.json({ linkpage: result.page }, { status: result.created ? 201 : 200, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
