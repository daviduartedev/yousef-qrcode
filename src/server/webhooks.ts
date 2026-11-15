import 'server-only';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { and, desc, eq, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { webhookDeliveries, webhooks } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import { getServerEnv } from '@/server/env';
import { apiLimits, blockedAddress, retryDelaysSeconds, webhookEvents, type DeliveryRecord, type WebhookEvent, type WebhookRecord } from '@/lib/developers';

const id = z.uuid();
const key = () => createHash('sha256').update(`webhook-secrets:${getServerEnv().secret}`).digest();

function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(part => part.toString('base64url')).join('.');
}
function decrypt(value: string) {
  const [iv, tag, data] = value.split('.').map(part => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`; receivers should reject old timestamps. */
export function signature(secret: string, timestamp: number, body: string) {
  return `t=${timestamp},v1=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

function loopbackTests() {
  const host = new URL(getServerEnv().appUrl).hostname;
  return ['localhost', '127.0.0.1', '[::1]'].includes(host) && !process.env.VERCEL && process.env.WEBHOOK_ALLOW_LOOPBACK === 'true';
}

/** HTTPS only (HTTP to loopback in local tests), no credentials, no private networks after DNS resolution. */
async function resolveTarget(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new HttpError(400, 'Enter a valid HTTPS address'); }
  const local = loopbackTests() && url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !local) || url.username || url.password) throw new HttpError(400, 'Enter a valid HTTPS address');
  const addresses = await lookup(url.hostname, { all: true }).catch(() => []);
  if (!addresses.length) throw new HttpError(400, 'The address could not be resolved');
  if (!local && addresses.some(item => blockedAddress(item.address))) throw new HttpError(400, 'Webhooks cannot reach private network addresses');
  return { url, address: addresses[0].address, family: addresses[0].family };
}

/** Sends one request to the address resolved above (no second lookup, no redirects), with a 5 s timeout. */
function post(target: Awaited<ReturnType<typeof resolveTarget>>, headers: Record<string, string>, body: string) {
  return new Promise<number>((resolve, reject) => {
    const send = target.url.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = send({
      hostname: target.url.hostname, port: target.url.port || undefined, path: target.url.pathname + target.url.search, method: 'POST',
      headers: { ...headers, 'content-type': 'application/json', 'content-length': Buffer.byteLength(body).toString(), 'user-agent': 'QRConnect-Webhooks/1' },
      lookup: (_hostname, _options, callback) => callback(null, target.address, target.family),
      timeout: apiLimits.timeoutMs,
    }, response => { response.resume(); response.on('end', () => resolve(response.statusCode ?? 0)); });
    req.on('timeout', () => req.destroy(new Error('Timed out')));
    req.on('error', reject);
    req.end(body);
  });
}

/**
 * Attempts one delivery. 2xx marks it delivered; anything else schedules a retry until the attempt limit,
 * then it is marked failed. The body keeps the same event id on every attempt, so receivers can drop duplicates.
 */
export async function attemptDelivery(deliveryId: string) {
  const db = getDb();
  // Claim the attempt so two workers never send the same delivery at once.
  const claimed = await db.update(webhookDeliveries).set({ nextAttemptAt: sql`now() + interval '2 minutes'` })
    .where(and(eq(webhookDeliveries.id, deliveryId), eq(webhookDeliveries.status, 'pending'), lte(webhookDeliveries.nextAttemptAt, sql`now()`)))
    .returning({ id: webhookDeliveries.id });
  if (!claimed.length) return;
  const [row] = await db.select({ delivery: webhookDeliveries, hook: webhooks }).from(webhookDeliveries)
    .innerJoin(webhooks, eq(webhooks.id, webhookDeliveries.webhookId)).where(eq(webhookDeliveries.id, deliveryId));
  if (!row || row.delivery.status === 'delivered') return;
  const body = JSON.stringify({ id: row.delivery.eventId, type: row.delivery.event, created_at: row.delivery.createdAt.toISOString(), data: row.delivery.payload });
  const timestamp = Math.floor(Date.now() / 1000);
  let statusCode: number | null = null;
  let error: string | null = null;
  try {
    const target = await resolveTarget(row.hook.url);
    statusCode = await post(target, { 'qrconnect-event-id': row.delivery.eventId, 'qrconnect-signature': signature(decrypt(row.hook.secretEncrypted), timestamp, body) }, body);
  } catch (cause) {
    error = cause instanceof HttpError ? cause.message : 'Connection failed';
  }
  const attempts = row.delivery.attempts + 1;
  const delivered = statusCode !== null && statusCode >= 200 && statusCode < 300;
  const exhausted = attempts >= apiLimits.maxAttempts;
  await db.update(webhookDeliveries).set({
    attempts, lastStatusCode: statusCode, lastError: delivered ? null : (error ?? `Receiver answered ${statusCode}`).slice(0, 200),
    status: delivered ? 'delivered' : exhausted ? 'failed' : 'pending',
    deliveredAt: delivered ? sql`now()` : null,
    nextAttemptAt: delivered || exhausted ? null : sql`now() + make_interval(secs => ${retryDelaysSeconds[Math.min(attempts - 1, retryDelaysSeconds.length - 1)]})`,
  }).where(eq(webhookDeliveries.id, deliveryId));
}

/** Queues an event for every active webhook of the workspace that subscribes to it, then tries them after the response. */
export async function emitEvent(workspaceId: string, event: WebhookEvent, data: Record<string, unknown>) {
  const hooks = await getDb().select({ id: webhooks.id, events: webhooks.events }).from(webhooks)
    .where(and(eq(webhooks.userId, workspaceId), eq(webhooks.active, true)));
  const targets = hooks.filter(hook => hook.events.includes(event));
  if (!targets.length) return [];
  const eventId = randomUUID();
  const rows = await getDb().insert(webhookDeliveries).values(targets.map(hook => ({
    webhookId: hook.id, eventId, event, payload: data, status: 'pending', nextAttemptAt: sql`now()`,
  }))).returning({ id: webhookDeliveries.id });
  return rows.map(row => row.id);
}

/** Retries due deliveries; called by the scheduled job and after each event. */
export async function processDueDeliveries(limit = 50) {
  const due = await getDb().select({ id: webhookDeliveries.id }).from(webhookDeliveries)
    .where(and(eq(webhookDeliveries.status, 'pending'), lte(webhookDeliveries.nextAttemptAt, sql`now()`))).limit(limit);
  for (const item of due) await attemptDelivery(item.id);
  return due.length;
}

const hookRecord = (row: typeof webhooks.$inferSelect): WebhookRecord => ({ id: row.id, url: row.url, events: row.events as WebhookEvent[], active: row.active, created_at: row.createdAt.toISOString() });

export async function listWebhooks(workspaceId: string) {
  const rows = await getDb().select().from(webhooks).where(eq(webhooks.userId, workspaceId)).orderBy(desc(webhooks.createdAt));
  return rows.map(hookRecord);
}

const createInput = z.object({ url: z.string().trim().max(2048), events: z.array(z.enum(webhookEvents)).min(1).max(webhookEvents.length) }).strict();

/** Creates a webhook; the signing secret is returned only in this response. */
export async function createWebhook(workspaceId: string, input: unknown) {
  const parsed = createInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Choose an HTTPS address and at least one event');
  await resolveTarget(parsed.data.url);
  const secret = `whsec_${randomBytes(24).toString('base64url')}`;
  return getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'webhooks:' + workspaceId}))`);
    const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` }).from(webhooks).where(eq(webhooks.userId, workspaceId));
    if (total >= apiLimits.webhooksPerWorkspace) throw new HttpError(409, 'You reached the webhook limit');
    const [row] = await tx.insert(webhooks).values({ userId: workspaceId, url: new URL(parsed.data.url).href, events: [...new Set(parsed.data.events)], secretEncrypted: encrypt(secret) }).returning();
    return { webhook: hookRecord(row), secret };
  });
}

export async function updateWebhook(workspaceId: string, hookId: string, input: unknown) {
  const parsed = z.object({ active: z.boolean().optional(), events: z.array(z.enum(webhookEvents)).min(1).optional() }).strict().safeParse(input);
  if (!parsed.success || !id.safeParse(hookId).success) throw new HttpError(400, 'Invalid webhook changes');
  const [row] = await getDb().update(webhooks).set({ ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}), ...(parsed.data.events ? { events: [...new Set(parsed.data.events)] } : {}) })
    .where(and(eq(webhooks.userId, workspaceId), eq(webhooks.id, hookId))).returning();
  if (!row) throw new HttpError(404, 'Webhook not found');
  return hookRecord(row);
}

export async function deleteWebhook(workspaceId: string, hookId: string) {
  if (!id.safeParse(hookId).success) throw new HttpError(404, 'Webhook not found');
  const [row] = await getDb().delete(webhooks).where(and(eq(webhooks.userId, workspaceId), eq(webhooks.id, hookId))).returning({ id: webhooks.id });
  if (!row) throw new HttpError(404, 'Webhook not found');
  return { deleted: true };
}

export async function listDeliveries(workspaceId: string, hookId: string): Promise<DeliveryRecord[]> {
  if (!id.safeParse(hookId).success) throw new HttpError(404, 'Webhook not found');
  const [hook] = await getDb().select({ id: webhooks.id }).from(webhooks).where(and(eq(webhooks.userId, workspaceId), eq(webhooks.id, hookId)));
  if (!hook) throw new HttpError(404, 'Webhook not found');
  const rows = await getDb().select({ delivery: webhookDeliveries }).from(webhookDeliveries).innerJoin(webhooks, eq(webhooks.id, webhookDeliveries.webhookId))
    .where(and(eq(webhooks.userId, workspaceId), eq(webhooks.id, hookId))).orderBy(desc(webhookDeliveries.createdAt)).limit(50);
  return rows.map(({ delivery }) => ({
    id: delivery.id, event_id: delivery.eventId, event: delivery.event, status: delivery.status as DeliveryRecord['status'], attempts: delivery.attempts,
    last_status_code: delivery.lastStatusCode, last_error: delivery.lastError, created_at: delivery.createdAt.toISOString(),
    delivered_at: delivery.deliveredAt?.toISOString() ?? null, next_attempt_at: delivery.nextAttemptAt?.toISOString() ?? null,
  }));
}

/** Sends a delivery again now, keeping its event id; at most once a minute per delivery. */
export async function redeliver(workspaceId: string, deliveryId: string) {
  if (!id.safeParse(deliveryId).success) throw new HttpError(404, 'Delivery not found');
  const [row] = await getDb().select({ id: webhookDeliveries.id }).from(webhookDeliveries).innerJoin(webhooks, eq(webhooks.id, webhookDeliveries.webhookId))
    .where(and(eq(webhooks.userId, workspaceId), eq(webhookDeliveries.id, deliveryId)));
  if (!row) throw new HttpError(404, 'Delivery not found');
  await getDb().update(webhookDeliveries).set({ status: 'pending', attempts: 0, nextAttemptAt: sql`now()` }).where(eq(webhookDeliveries.id, deliveryId));
  await attemptDelivery(deliveryId);
  return (await listDeliveriesById(deliveryId));
}

async function listDeliveriesById(deliveryId: string) {
  const [delivery] = await getDb().select().from(webhookDeliveries).where(eq(webhookDeliveries.id, deliveryId));
  return { id: delivery.id, status: delivery.status, attempts: delivery.attempts, last_status_code: delivery.lastStatusCode };
}

/** A test event to check the receiver and its signature check. */
export async function pingWebhook(workspaceId: string, hookId: string) {
  if (!id.safeParse(hookId).success) throw new HttpError(404, 'Webhook not found');
  const [hook] = await getDb().select().from(webhooks).where(and(eq(webhooks.userId, workspaceId), eq(webhooks.id, hookId)));
  if (!hook) throw new HttpError(404, 'Webhook not found');
  const [row] = await getDb().insert(webhookDeliveries).values({ webhookId: hook.id, eventId: randomUUID(), event: 'ping', payload: { message: 'QRConnect webhook test' }, status: 'pending', nextAttemptAt: sql`now()` }).returning({ id: webhookDeliveries.id });
  await attemptDelivery(row.id);
  return listDeliveriesById(row.id);
}

/** Queues the event and tries each delivery right away; failures are retried by the scheduled job. */
export async function emitAndDeliver(workspaceId: string, event: WebhookEvent, data: Record<string, unknown>) {
  try {
    for (const deliveryId of await emitEvent(workspaceId, event, data)) await attemptDelivery(deliveryId);
  } catch {
    console.error(`Webhook event ${event} could not be queued.`);
  }
}
