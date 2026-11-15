import { z } from 'zod';
import { apiError, HttpError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { deleteWebhook, listDeliveries, updateWebhook } from '@/server/webhooks';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

/** Recent deliveries of the integration. */
export async function GET(request: Request, context: Context) {
  try {
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json({ deliveries: await listDeliveries(workspace.id, (await context.params).id, 'integration') }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

/** Pauses or resumes; events and credentials are changed by connecting again. */
export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'manage');
    const parsed = z.object({ active: z.boolean() }).strict().safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, 'Invalid integration changes');
    await updateWebhook(workspace.id, (await context.params).id, parsed.data, 'integration');
    return Response.json({ updated: true }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

/** Disconnects and erases the stored credential. */
export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json(await deleteWebhook(workspace.id, (await context.params).id, 'integration'), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
