import { listCodes, listCodePage, createCode } from '@/server/qr-codes';
import { readQRListQuery } from '@/lib/qr-list';
import { requireApiUser, requireSameOrigin, readJson, apiError, privateHeaders } from '@/server/http';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser(request);
    const params = new URL(request.url).searchParams;
    const paginated = ['page', 'q', 'mode', 'status'].some(key => params.has(key));
    const result = paginated
      ? await listCodePage(user.id, readQRListQuery(params))
      : { qrCodes: await listCodes(user.id) };
    return Response.json(result, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser(request);
    return Response.json(await createCode(user.id, await readJson(request)), { status: 201, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
