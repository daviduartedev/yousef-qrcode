import { z } from 'zod';
import { apiError, HttpError, privateHeaders, readJson, requireSameOrigin } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
import { lookupCode } from '@/server/qr-codes';

export const runtime = 'nodejs';

/** Finds the workspace QR for a payload decoded from an image in the browser; the payload travels in the body. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request, 'read');
    const body = z.object({ data: z.string().max(2048) }).strict().safeParse(await readJson(request, 8192));
    if (!body.success) throw new HttpError(400, 'Invalid image content');
    const found = await lookupCode(workspace.id, body.data.data);
    if (!found) throw new HttpError(404, 'This QR code is not in the current workspace.');
    return Response.json(found, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
