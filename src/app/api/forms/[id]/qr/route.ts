import { apiError, privateHeaders, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { formQr } from '@/server/forms';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    const result = await formQr(workspace.id, (await context.params).id);
    return Response.json(result, { status: result.created ? 201 : 200, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
