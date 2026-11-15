import { apiError, privateHeaders, readJson, requireApiUser, requireSameOrigin } from '@/server/http';
import { createLinkpage, listLinkpages } from '@/server/linkpages';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return Response.json({ linkpages: await listLinkpages(user.id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    const result = await createLinkpage(user.id, await readJson(request));
    return Response.json({ linkpage: result.page }, { status: result.created ? 201 : 200, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
