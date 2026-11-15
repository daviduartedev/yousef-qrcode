import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { deleteWebhook, listDeliveries, updateWebhook } from '@/server/webhooks';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

/** Recent deliveries of the webhook. */
export async function GET(request: Request, context: Context) {
  try {
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json({ deliveries: await listDeliveries(workspace.id, (await context.params).id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json({ webhook: await updateWebhook(workspace.id, (await context.params).id, await readJson(request)) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json(await deleteWebhook(workspace.id, (await context.params).id), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
