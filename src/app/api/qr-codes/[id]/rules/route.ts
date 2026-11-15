import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { updateRules } from '@/server/qr-rules';

export const runtime = 'nodejs';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json({ rules: await updateRules(workspace.id, (await context.params).id, await readJson(request, 4096)) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
