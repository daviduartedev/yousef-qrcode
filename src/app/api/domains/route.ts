import { apiError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { addDomain, listDomains } from '@/server/domains';
import { can } from '@/lib/workspaces';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request);
    return Response.json({ domains: await listDomains(workspace.id, can(workspace.role, 'manage')) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'manage');
    return Response.json({ domain: await addDomain(workspace.id, await readJson(request)) }, { status: 201, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
