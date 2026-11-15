import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { createWebhook, listWebhooks } from '@/server/webhooks';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json({ webhooks: await listWebhooks(workspace.id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json(await createWebhook(workspace.id, await readJson(request)), { status: 201, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
