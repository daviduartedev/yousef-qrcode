import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { createKey, listKeys } from '@/server/api-keys';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json({ keys: await listKeys(workspace.id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json(await createKey(workspace.id, workspace.userId, await readJson(request)), { status: 201, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
