import { apiError, privateHeaders, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { redeliver } from '@/server/webhooks';

export const runtime = 'nodejs';

/** Sends a stored integration delivery again. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json({ delivery: await redeliver(workspace.id, (await context.params).id, 'integration') }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
