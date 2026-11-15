import 'server-only';
import { HttpError, readJson } from '@/server/http';
import { authenticateApi, type ApiCaller } from '@/server/api-keys';
import type { ApiScope } from '@/lib/developers';

const base = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };

/** Runs a public API handler with key authentication, scope check, quota headers and JSON errors. */
export async function publicApi(request: Request, scope: ApiScope, handler: (caller: ApiCaller) => Promise<{ status?: number; body: unknown }>) {
  let caller: ApiCaller | null = null;
  try {
    caller = await authenticateApi(request, scope);
    const result = await handler(caller);
    return new Response(JSON.stringify(result.body), { status: result.status ?? 200, headers: { ...base,
      'X-RateLimit-Limit': '60', 'X-RateLimit-Remaining': String(caller.remaining), 'X-RateLimit-Reset': String(caller.reset) } });
  } catch (error) {
    const known = error instanceof HttpError;
    const status = known ? error.status : 500;
    if (!known) console.error('Public API request failed; private details are suppressed.');
    const reset = (error as { reset?: number }).reset;
    return new Response(JSON.stringify({ error: known ? error.message : 'Unable to complete this request' }), { status, headers: { ...base,
      ...(status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}),
      ...(status === 429 && reset ? { 'Retry-After': String(Math.max(1, reset - Math.floor(Date.now() / 1000))), 'X-RateLimit-Reset': String(reset) } : {}) } });
  }
}

/** Reads a JSON body of at most 16 KB. */
export function readApiJson(request: Request) {
  return readJson(request, 16 * 1024);
}
