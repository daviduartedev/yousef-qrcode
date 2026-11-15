import { z } from 'zod';
import { apiError, HttpError, privateHeaders, readJson, requireApiUser, requireSameOrigin } from '@/server/http';
import { acceptInvitation } from '@/server/workspaces';
import { getServerEnv } from '@/server/env';
import { workspaceCookie } from '@/lib/workspaces';

export const runtime = 'nodejs';

/** Accepts an invitation for the signed-in account and switches to the organization. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    const body = z.object({ token: z.string().max(100) }).strict().safeParse(await readJson(request));
    if (!body.success) throw new HttpError(400, 'This invitation is invalid or expired');
    const result = await acceptInvitation(user.id, user.email, body.data.token, user.emailVerified);
    const secure = getServerEnv().appUrl.startsWith('https:') ? '; Secure' : '';
    return Response.json(result, { headers: { ...privateHeaders, 'Set-Cookie': `${workspaceCookie}=${result.workspace_id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}` } });
  } catch (error) { return apiError(error); }
}
