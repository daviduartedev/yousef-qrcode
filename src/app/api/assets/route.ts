import { apiError, privateHeaders, requireApiUser, requireSameOrigin } from '@/server/http';
import { listAssets, readAssetQuery, uploadAsset } from '@/server/assets';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return Response.json(await listAssets(user.id, readAssetQuery(new URL(request.url).searchParams)), { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    return Response.json({ asset: await uploadAsset(user.id, request) }, { status: 201, headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
