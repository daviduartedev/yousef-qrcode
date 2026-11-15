import { apiError, privateHeaders, readJson, requireApiUser, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { createOrganization, listWorkspaces } from '@/server/workspaces';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const active = await requireApiWorkspace(request, 'read');
    return Response.json({ workspaces: await listWorkspaces(active.userId), active }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

/** Creates an organization owned by the signed-in account. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    return Response.json({ workspace: await createOrganization(user.id, await readJson(request)) }, { status: 201, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
