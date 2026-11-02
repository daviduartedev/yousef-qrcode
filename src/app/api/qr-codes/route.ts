import { listCodes, createCode } from '@/server/qr-codes';
import { requireApiUser, requireSameOrigin, readJson, apiError, privateHeaders } from '@/server/http';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    return Response.json({ qrCodes: await listCodes(user.id) }, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    return Response.json(await createCode(user.id, await readJson(request)), { status: 201, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
