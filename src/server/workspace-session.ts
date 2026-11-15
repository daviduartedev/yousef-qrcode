import 'server-only';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { HttpError, requireApiUser } from '@/server/http';
import { requirePageSession } from '@/server/session';
import { assertPermission, resolveWorkspace, type ActiveWorkspace } from '@/server/workspaces';
import { workspaceCookie, type WorkspacePermission } from '@/lib/workspaces';

function cookieValue(header: string | null, name: string) {
  for (const part of (header ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

/**
 * The workspace an API request acts on. The cookie only selects among workspaces the signed-in user belongs to;
 * membership and role are checked on every request. `id` is the owner id passed to the data modules.
 */
export async function requireApiWorkspace(request: Request, permission: WorkspacePermission = request.method === 'GET' || request.method === 'HEAD' ? 'read' : 'write'): Promise<ActiveWorkspace> {
  const user = await requireApiUser(request);
  const workspace = await resolveWorkspace(user.id, cookieValue(request.headers.get('cookie'), workspaceCookie));
  // A tab sends the workspace it shows; after a switch in another tab its requests are refused instead of landing elsewhere.
  const expected = request.headers.get('x-workspace-id');
  if (expected && expected !== workspace.id) throw new HttpError(409, 'The workspace changed in another tab. Reload the page.');
  assertPermission(workspace, permission);
  return workspace;
}

/** Page variant: signs in first, then resolves the selected workspace. Missing permission shows "not found". */
export async function requirePageWorkspace(returnTo: string, permission: WorkspacePermission = 'read') {
  const session = await requirePageSession(returnTo);
  const store = await cookies();
  await headers();
  const workspace = await resolveWorkspace(session.user.id, store.get(workspaceCookie)?.value);
  try { assertPermission(workspace, permission); } catch { notFound(); }
  return { session, workspace };
}
