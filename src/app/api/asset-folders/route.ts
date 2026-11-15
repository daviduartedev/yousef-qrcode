import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { changeAssetFolder } from '@/server/assets';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json({ folders: await changeAssetFolder(workspace.id, await readJson(request)) }, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
