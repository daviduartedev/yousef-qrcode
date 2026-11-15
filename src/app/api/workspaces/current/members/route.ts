import { apiError, privateHeaders } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { listMembers } from '@/server/workspaces';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request, 'read');
    return Response.json({ workspace, ...(await listMembers(workspace)) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
