import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { reviewGeneration } from '@/server/ai';

export const runtime = 'nodejs';

/** Approve (creates an unpublished draft) or reject a generated draft. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json({ generation: await reviewGeneration(workspace.id, workspace.userId, (await context.params).id, await readJson(request)) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
