import { z } from 'zod';
import { apiError, HttpError, privateHeaders, readJson, requireApiUser, requireSameOrigin } from '@/server/http';
import { publishCard } from '@/server/cards';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    const body = z.object({ publish: z.boolean() }).strict().safeParse(await readJson(request));
    if (!body.success) throw new HttpError(400, 'Invalid publish request');
    return Response.json({ card: await publishCard(user.id, (await context.params).id, body.data.publish) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
