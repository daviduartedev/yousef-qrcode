import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { deleteAsset, updateAsset } from '@/server/assets';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json({ asset: await updateAsset(workspace.id, (await context.params).id, await readJson(request)) }, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json(await deleteAsset(workspace.id, (await context.params).id), { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
