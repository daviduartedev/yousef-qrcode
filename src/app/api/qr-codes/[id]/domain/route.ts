import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { setTrackingDomain } from '@/server/qr-rules';

export const runtime = 'nodejs';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json(await setTrackingDomain(workspace.id, (await context.params).id, await readJson(request)), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
