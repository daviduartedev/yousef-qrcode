import 'server-only';
import { and, eq, gte, isNotNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { customDomains, qrAliases, qrCodes, qrScans } from '@/server/db/schema';
import { safeDestination } from '@/server/qr-codes';
import { HttpError } from '@/server/http';
import { getServerEnv } from '@/server/env';
import { duplicateWindowSeconds } from '@/lib/qr-analytics';
import { roundCoordinate, scheduleOpen } from '@/lib/qr-rules';
import { visitorFrom } from '@/server/visitor';
import { checkPassword, type StoredRules } from '@/server/qr-rules';

const noCache = { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' };
const validCode = (code: string | null | undefined): code is string => Boolean(code && /^[A-Za-z0-9_-]{1,32}$/.test(code));
type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];
type QRRow = typeof qrCodes.$inferSelect;

/** Short codes and permanent aliases both resolve; the row is locked for the scan. */
async function findCode(tx: Tx, code: string) {
  const [qr] = await tx.select().from(qrCodes).where(eq(qrCodes.shortCode, code)).for('update');
  if (qr) return qr;
  const [alias] = await tx.select({ qrCodeId: qrAliases.qrCodeId }).from(qrAliases).where(eq(qrAliases.alias, code.toLowerCase()));
  if (!alias) return null;
  // The alias of a deleted code stays reserved and never reaches another code.
  if (!alias.qrCodeId) throw new HttpError(410, 'QR code is inactive');
  const [aliased] = await tx.select().from(qrCodes).where(eq(qrCodes.id, alias.qrCodeId)).for('update');
  return aliased ?? null;
}

/**
 * The app address serves every code. A custom host serves only codes of the workspace that verified it,
 * so codes printed with an earlier domain of the same workspace keep working after a change.
 */
async function hostAllowed(tx: Tx, host: string, qr: QRRow) {
  if (host === new URL(getServerEnv().appUrl).host) return true;
  const [domain] = await tx.select({ id: customDomains.id }).from(customDomains)
    .where(and(eq(customDomains.userId, qr.userId), eq(customDomains.hostname, host), isNotNull(customDomains.verifiedAt)));
  return Boolean(domain);
}

async function usable(tx: Tx, host: string, code: string) {
  const qr = await findCode(tx, code);
  if (!qr || !(await hostAllowed(tx, host, qr))) throw new HttpError(404, 'QR code not found');
  if (!qr.isActive) throw new HttpError(410, 'QR code is inactive');
  if (!safeDestination(qr.destinationUrl)) throw new HttpError(410, 'QR destination is unavailable');
  return qr;
}

/** Counts a scan; bots and repeats from the same trusted address within 10 s are skipped. */
async function recordScan(tx: Tx, request: Request, qr: QRRow, location?: { latitude: number; longitude: number }) {
  const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(qrScans)
    .where(and(eq(qrScans.qrCodeId, qr.id), gte(qrScans.scannedAt, sql`now() - interval '60 seconds'`)));
  if (count >= 300) throw new HttpError(429, 'Please try this QR code again shortly');
  const visitor = visitorFrom(request);
  const { userAgent, ipAddress } = visitor;
  if (visitor.bot) return;
  if (ipAddress) {
    const [{ repeats }] = await tx.select({ repeats: sql<number>`count(*)::int` }).from(qrScans).where(and(
      eq(qrScans.qrCodeId, qr.id), eq(qrScans.ipAddress, ipAddress), eq(qrScans.userAgent, userAgent),
      gte(qrScans.scannedAt, sql`now() - make_interval(secs => ${duplicateWindowSeconds})`),
    ));
    if (repeats > 0) return;
  }
  await tx.insert(qrScans).values({
    qrCodeId: qr.id, userAgent, deviceType: visitor.deviceType, os: visitor.os, browser: visitor.browser,
    ipAddress, country: visitor.country, city: visitor.city,
    latitude: location ? roundCoordinate(location.latitude) : null, longitude: location ? roundCoordinate(location.longitude) : null,
  });
  await tx.update(qrCodes).set({ totalScans: sql`${qrCodes.totalScans} + 1`, updatedAt: new Date() }).where(eq(qrCodes.id, qr.id));
}

type Outcome = { kind: 'redirect'; location: string } | { kind: 'closed'; reason: string };

/** Outside its schedule a code sends people to the fallback, or explains that it is closed. */
function scheduleOutcome(qr: QRRow): Outcome | null {
  const rules = (qr.rules ?? {}) as StoredRules;
  if (!rules.schedule) return null;
  const state = scheduleOpen(rules.schedule);
  if (state.open) return null;
  if (rules.fallbackUrl && safeDestination(rules.fallbackUrl)) return { kind: 'redirect', location: rules.fallbackUrl };
  return { kind: 'closed', reason: state.reason === 'not-started' ? 'This QR code is not active yet' : state.reason === 'ended' ? 'This QR code has ended' : 'This QR code is closed right now' };
}

export async function scanAndRedirect(request: Request, record = true, pathCode?: string) {
  try {
    const code = pathCode ?? new URL(request.url).searchParams.get('code');
    if (!validCode(code)) throw new HttpError(404, 'QR code not found');
    // The Host header carries the custom domain; request.url reflects the server's own address.
    const host = (request.headers.get('host') ?? new URL(request.url).host).toLowerCase();
    const outcome = await getDb().transaction(async (tx): Promise<Outcome> => {
      const qr = await usable(tx, host, code);
      const scheduled = scheduleOutcome(qr);
      if (scheduled) return scheduled;
      const rules = (qr.rules ?? {}) as StoredRules;
      // A password or a location question needs a page before the redirect; the scan is counted there.
      if (rules.passwordHash || rules.askLocation) return { kind: 'redirect', location: `${getServerEnv().appUrl}/qr/gate?code=${encodeURIComponent(qr.shortCode)}` };
      if (record) await recordScan(tx, request, qr);
      return { kind: 'redirect', location: new URL(qr.destinationUrl).href };
    });
    if (outcome.kind === 'closed') throw new HttpError(410, outcome.reason);
    return new Response(null, { status: 302, headers: { ...noCache, Location: outcome.location } });
  } catch (error) {
    const known = error instanceof HttpError;
    const status = known ? error.status : 503;
    const message = known ? error.message : 'QR service is temporarily unavailable';
    const safeMessage = message.replace(/[&<>"']/g, character => `&#${character.charCodeAt(0)};`);
    return new Response(record ? `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QRConnect</title></head><body><main><h1>${safeMessage}</h1><a href="/">Return to Home</a></main></body></html>` : null,
      { status, headers: { ...noCache, 'Content-Type': 'text/html; charset=utf-8', ...(status === 429 ? { 'Retry-After': '60' } : {}) } });
  }
}

/** Public facts the gate page needs; never the destination or the password. */
export async function gateInfo(code: string) {
  if (!validCode(code)) return null;
  const [qr] = await getDb().select().from(qrCodes).where(eq(qrCodes.shortCode, code));
  if (!qr || !qr.isActive || !qr.trackingEnabled) return null;
  const rules = (qr.rules ?? {}) as StoredRules;
  return { code: qr.shortCode, title: qr.title, needsPassword: Boolean(rules.passwordHash), askLocation: Boolean(rules.askLocation) };
}

const unlockInput = z.object({
  code: z.string(),
  password: z.string().max(128).optional(),
  location: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict().optional(),
}).strict();

/**
 * Completes a gated scan: checks the password (with attempt limits), records the scan with the location the
 * visitor chose to share, and returns where to go.
 */
export async function unlockScan(request: Request, input: unknown) {
  const parsed = unlockInput.safeParse(input);
  if (!parsed.success || !validCode(parsed.data.code)) throw new HttpError(400, 'Invalid request');
  const visitor = visitorFrom(request);
  const appHost = new URL(getServerEnv().appUrl).host;
  // The password is checked before the scan transaction locks the code, so failed attempts can be recorded.
  const preview = await getDb().transaction(async tx => usable(tx, appHost, parsed.data.code));
  // The schedule comes first, so a closed code does not reveal whether a password is right.
  const closed = scheduleOutcome(preview);
  if (closed?.kind === 'closed') throw new HttpError(410, closed.reason);
  if (closed) return { destination: closed.location };
  const previewRules = (preview.rules ?? {}) as StoredRules;
  if (previewRules.passwordHash) await checkPassword(preview.id, visitor.ipAddress, previewRules, parsed.data.password);
  return getDb().transaction(async tx => {
    const qr = await usable(tx, appHost, parsed.data.code);
    const scheduled = scheduleOutcome(qr);
    if (scheduled?.kind === 'closed') throw new HttpError(410, scheduled.reason);
    if (scheduled) return { destination: scheduled.location };
    const rules = (qr.rules ?? {}) as StoredRules;
    // The password may have changed between the check and the lock.
    if (rules.passwordHash !== previewRules.passwordHash) throw new HttpError(409, 'The QR code changed. Try again.');
    await recordScan(tx, request, qr, rules.askLocation ? parsed.data.location : undefined);
    return { destination: new URL(qr.destinationUrl).href };
  });
}
