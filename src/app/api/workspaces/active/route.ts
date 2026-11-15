import { z } from 'zod';
import { apiError, HttpError, privateHeaders, readJson, requireApiUser, requireSameOrigin } from '@/server/http';
import { resolveWorkspace } from '@/server/workspaces';
import { getServerEnv } from '@/server/env';
import { workspaceCookie } from '@/lib/workspaces';

export const runtime = 'nodejs';

/** Switches the active workspace; only workspaces the account belongs to can be selected. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    const body = z.object({ id: z.uuid() }).strict().safeParse(await readJson(request));
    if (!body.success) throw new HttpError(400, 'Choose a workspace');
    const workspace = await resolveWorkspace(user.id, body.data.id);
    if (workspace.id !== body.data.id) throw new HttpError(404, 'Workspace not found');
    const secure = getServerEnv().appUrl.startsWith('https:') ? '; Secure' : '';
    return Response.json({ workspace }, { headers: { ...privateHeaders, 'Set-Cookie': `${workspaceCookie}=${workspace.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}` } });
  } catch (error) { return apiError(error); }
}
