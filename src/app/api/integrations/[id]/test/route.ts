import { apiError, privateHeaders, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { pingWebhook } from '@/server/webhooks';

export const runtime = 'nodejs';

/** Checks the connection without recording data at the connector. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json({ delivery: await pingWebhook(workspace.id, (await context.params).id, 'integration') }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
