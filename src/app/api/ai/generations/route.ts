import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { listGenerations, requestGeneration, usage } from '@/server/ai';

export const runtime = 'nodejs';
/** A draft can take up to a minute or two to write. */
export const maxDuration = 120;

export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request);
    const [generations, used] = await Promise.all([listGenerations(workspace.id), usage(workspace.id)]);
    return Response.json({ generations, usage: used }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json({ generation: await requestGeneration(workspace.id, workspace.userId, await readJson(request)) }, { status: 201, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
