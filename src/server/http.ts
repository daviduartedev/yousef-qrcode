import 'server-only';
import { getAuth } from '@/server/auth';
import { getServerEnv } from '@/server/env';

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

export async function requireApiUser(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) throw new HttpError(401, 'Authentication required');
  return session.user;
}
export function requireSameOrigin(request: Request) {
  if (request.headers.get('origin') !== getServerEnv().appUrl) throw new HttpError(403, 'Request origin is not allowed');
}
export async function readJson(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON content required');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'JSON body required');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new HttpError(413, 'Request body is too large'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; }
  catch { throw new HttpError(400, 'Invalid JSON body'); }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status, headers: privateHeaders });
  console.error('Request failed; private error details are suppressed.');
  return Response.json({ error: 'Unable to complete this request' }, { status: 500, headers: privateHeaders });
}
