import { apiError, readJson, requireSameOrigin } from '@/server/http';
import { unlockScan } from '@/server/scans';

export const runtime = 'nodejs';

/** Completes a scan behind a password or a location question; answers with the destination. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    return Response.json(await unlockScan(request, await readJson(request, 2048)), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
