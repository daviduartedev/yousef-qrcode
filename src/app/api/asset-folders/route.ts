import { apiError, privateHeaders, readJson, requireApiUser, requireSameOrigin } from '@/server/http';
import { changeAssetFolder } from '@/server/assets';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    return Response.json({ folders: await changeAssetFolder(user.id, await readJson(request)) }, { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
