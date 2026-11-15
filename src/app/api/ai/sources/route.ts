import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { createSource, listSources } from '@/server/ai';
import { aiLimits } from '@/lib/ai';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request);
    return Response.json({ sources: await listSources(workspace.id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json({ source: await createSource(workspace.id, await readJson(request, aiLimits.sourceChars * 4 + 1024)) }, { status: 201, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
