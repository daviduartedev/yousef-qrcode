import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { addAlias, listAliases } from '@/server/qr-rules';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const workspace = await requireApiWorkspace(request);
    return Response.json({ aliases: await listAliases(workspace.id, (await context.params).id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json({ alias: await addAlias(workspace.id, (await context.params).id, await readJson(request)) }, { status: 201, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
