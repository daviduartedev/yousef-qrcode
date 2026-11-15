import { apiError, privateHeaders, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { redeliver } from '@/server/webhooks';

export const runtime = 'nodejs';

/** Controlled redelivery: sends the same event (same id) again now. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json({ delivery: await redeliver(workspace.id, (await context.params).id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
