import { listCodes, listCodePage, createCode } from '@/server/qr-codes';
import { qrListKeys, readQRListQuery } from '@/lib/qr-list';
import { requireSameOrigin, readJson, apiError, privateHeaders } from '@/server/http';
import { requireApiWorkspace } from '@/server/workspace-session';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const workspace = await requireApiWorkspace(request);
    const params = new URL(request.url).searchParams;
    const paginated = qrListKeys.some(key => params.has(key));
    const result = paginated
      ? await listCodePage(workspace.id, readQRListQuery(params))
      : { qrCodes: await listCodes(workspace.id) };
    return Response.json(result, { headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const workspace = await requireApiWorkspace(request);
    return Response.json(await createCode(workspace.id, await readJson(request)), { status: 201, headers: privateHeaders });
  } catch (error) { return apiError(error); }
}
