import { apiError, privateHeaders, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { verifyDomain } from '@/server/domains';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json(await verifyDomain(workspace.id, (await context.params).id), { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
