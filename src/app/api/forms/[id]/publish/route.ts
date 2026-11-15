import { z } from 'zod';
import { apiError, HttpError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { publishForm } from '@/server/forms';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    const body = z.object({ publish: z.boolean() }).strict().safeParse(await readJson(request));
    if (!body.success) throw new HttpError(400, 'Invalid publish request');
    return Response.json({ form: await publishForm(workspace.id, (await context.params).id, body.data.publish) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
