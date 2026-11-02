import { scanAndRedirect } from '@/server/scans';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return scanAndRedirect(request); }
export async function HEAD(request: Request) { return scanAndRedirect(request, false); }
