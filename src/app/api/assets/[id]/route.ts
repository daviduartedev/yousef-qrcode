import { apiError, privateHeaders, readJson, requireApiUser, requireSameOrigin } from '@/server/http';
import { deleteAsset, updateAsset } from '@/server/assets';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    return Response.json({ asset: await updateAsset(user.id, (await context.params).id, await readJson(request)) }, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    return Response.json(await deleteAsset(user.id, (await context.params).id), { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
