import { apiError, privateHeaders, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { listAssets, readAssetQuery, uploadAsset } from '@/server/assets';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request);
    return Response.json(await listAssets(workspace.id, readAssetQuery(new URL(request.url).searchParams)), { headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json({ asset: await uploadAsset(workspace.id, request) }, { status: 201, headers: privateHeaders });
  } catch (error) {
    return apiError(error);
  }
}
