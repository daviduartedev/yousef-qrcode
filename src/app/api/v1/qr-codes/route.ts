import { publicApi, readApiJson } from '@/server/public-api';
import { createCode, listCodePage } from '@/server/qr-codes';
import { readQRListQuery } from '@/lib/qr-list';

export const runtime = 'nodejs';

/** GET /api/v1/qr-codes?page=&q= — the key's workspace codes, 20 per page. */
export async function GET(request: Request) {
  return publicApi(request, 'qr:read', async caller => {
    const page = await listCodePage(caller.workspaceId, readQRListQuery(new URL(request.url).searchParams));
    return { body: { data: page.qrCodes, page: page.page, page_count: page.pages, total: page.total } };
  });
}

/** POST /api/v1/qr-codes — same body as the app: destination_url, content (static types) or link. */
export async function POST(request: Request) {
  return publicApi(request, 'qr:write', async caller => ({ status: 201, body: await createCode(caller.workspaceId, await readApiJson(request)) }));
}
