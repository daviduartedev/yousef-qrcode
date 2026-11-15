import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { apiKeys, apiKeyUsage } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import { apiLimits, apiScopes, type ApiKeyRecord, type ApiScope } from '@/lib/developers';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const keyPattern = /^qrc_([a-z0-9]{12})_([A-Za-z0-9_-]{43})$/;

const record = (row: typeof apiKeys.$inferSelect): ApiKeyRecord => ({
  id: row.id, name: row.name, prefix: row.prefix, scopes: row.scopes as ApiScope[], created_at: row.createdAt.toISOString(),
  last_used_at: row.lastUsedAt?.toISOString() ?? null, revoked_at: row.revokedAt?.toISOString() ?? null,
});

export async function listKeys(workspaceId: string) {
  const rows = await getDb().select().from(apiKeys).where(eq(apiKeys.userId, workspaceId)).orderBy(desc(apiKeys.createdAt));
  return rows.map(record);
}

const createInput = z.object({ name: z.string().trim().min(1).max(60), scopes: z.array(z.enum(apiScopes)).min(1).max(apiScopes.length) }).strict();

/** Creates a key; the full value is returned only now. Afterwards only its prefix is shown. */
export async function createKey(workspaceId: string, createdBy: string, input: unknown) {
  const parsed = createInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Enter a name and choose at least one permission');
  return getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'api-keys:' + workspaceId}))`);
    const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` }).from(apiKeys).where(and(eq(apiKeys.userId, workspaceId), isNull(apiKeys.revokedAt)));
    if (total >= apiLimits.keysPerWorkspace) throw new HttpError(409, 'You reached the API key limit. Revoke a key to create another.');
    const prefix = randomBytes(9).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').padEnd(12, '0').slice(0, 12);
    const secret = randomBytes(32).toString('base64url');
    const key = `qrc_${prefix}_${secret}`;
    const [row] = await tx.insert(apiKeys).values({ userId: workspaceId, name: parsed.data.name, prefix, keyHash: hash(key), scopes: [...new Set(parsed.data.scopes)], createdBy }).returning();
    return { key, apiKey: record(row) };
  });
}

/** Revoked keys stop working on the next request. */
export async function revokeKey(workspaceId: string, keyId: string) {
  if (!z.uuid().safeParse(keyId).success) throw new HttpError(404, 'API key not found');
  const [row] = await getDb().update(apiKeys).set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.userId, workspaceId), eq(apiKeys.id, keyId), isNull(apiKeys.revokedAt))).returning();
  if (!row) throw new HttpError(404, 'API key not found');
  return record(row);
}

export type ApiCaller = { workspaceId: string; keyId: string; scopes: ApiScope[]; remaining: number; reset: number };

/**
 * Authenticates `Authorization: Bearer qrc_…`, checks the scope and counts the request in a one-minute window
 * (60 per key). Unknown, malformed and revoked keys get the same 401.
 */
export async function authenticateApi(request: Request, scope: ApiScope): Promise<ApiCaller> {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer (\S+)$/.exec(header)?.[1]?.match(keyPattern);
  if (!match) throw new HttpError(401, 'Send a valid API key as a Bearer token');
  const [row] = await getDb().select().from(apiKeys).where(eq(apiKeys.prefix, match[1]));
  const expected = row ? Buffer.from(row.keyHash, 'hex') : Buffer.alloc(32);
  const given = Buffer.from(hash(match[0]), 'hex');
  if (!row || !timingSafeEqual(expected, given) || row.revokedAt) throw new HttpError(401, 'Send a valid API key as a Bearer token');
  if (!(row.scopes as string[]).includes(scope)) throw new HttpError(403, `This key does not have the ${scope} permission`);
  const { rows } = await getDb().execute<{ requests: number; reset: number }>(sql`insert into qrconnect.api_key_usage (key_id, window_start, requests)
      values (${row.id}, date_trunc('minute', now()), 1)
      on conflict (key_id, window_start) do update set requests = qrconnect.api_key_usage.requests + 1
      returning requests, extract(epoch from date_trunc('minute', now()) + interval '1 minute')::int as reset`);
  const used = rows[0].requests;
  if (used > apiLimits.requestsPerMinute) throw Object.assign(new HttpError(429, 'Too many requests. Wait for the next minute.'), { reset: rows[0].reset });
  await getDb().update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id));
  // The first request of a minute clears this key's old windows.
  if (used === 1) await getDb().delete(apiKeyUsage).where(and(eq(apiKeyUsage.keyId, row.id), sql`${apiKeyUsage.windowStart} < now() - interval '1 hour'`));
  return { workspaceId: row.userId, keyId: row.id, scopes: row.scopes as ApiScope[], remaining: apiLimits.requestsPerMinute - used, reset: rows[0].reset };
}
