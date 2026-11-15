import { scanAndRedirect } from '@/server/scans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ code: string }> };

/** Short form of the scan address, also served on verified custom domains: https://<domain>/r/<code>. */
export async function GET(request: Request, context: Context) { return scanAndRedirect(request, true, (await context.params).code); }
export async function HEAD(request: Request, context: Context) { return scanAndRedirect(request, false, (await context.params).code); }
