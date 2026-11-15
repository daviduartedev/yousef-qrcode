import 'server-only';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { customDomains, qrAliases, qrCodes, qrUnlockFailures } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import { safeDestination } from '@/lib/qr-destination';
import { rulesInputSchema, validAlias, type QRRulesView, type QRSchedule } from '@/lib/qr-rules';
import { isLinkedQRType } from '@/lib/qr-linked';

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, length: number) => Promise<Buffer>;
const id = z.uuid();

/** What is stored in `qr_codes.rules`. The password is kept only as a salted scrypt hash. */
export type StoredRules = { passwordHash?: string; passwordSalt?: string; schedule?: QRSchedule | null; fallbackUrl?: string | null; askLocation?: boolean };

export function rulesView(value: unknown): QRRulesView | null {
  if (!value || typeof value !== 'object') return null;
  const rules = value as StoredRules;
  return { hasPassword: Boolean(rules.passwordHash), schedule: rules.schedule ?? null, fallbackUrl: rules.fallbackUrl ?? null, askLocation: Boolean(rules.askLocation) };
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return { passwordHash: (await scrypt(password, salt, 32)).toString('base64'), passwordSalt: salt.toString('base64') };
}

export async function passwordMatches(rules: StoredRules, password: string) {
  if (!rules.passwordHash || !rules.passwordSalt) return false;
  const expected = Buffer.from(rules.passwordHash, 'base64');
  const actual = await scrypt(password, Buffer.from(rules.passwordSalt, 'base64'), expected.length);
  return timingSafeEqual(expected, actual);
}

async function trackedCode(workspaceId: string, qrId: string) {
  if (!id.safeParse(qrId).success) throw new HttpError(404, 'QR code not found');
  const [row] = await getDb().select().from(qrCodes).where(and(eq(qrCodes.userId, workspaceId), eq(qrCodes.id, qrId)));
  if (!row) throw new HttpError(404, 'QR code not found');
  if (!row.trackingEnabled) throw new HttpError(409, 'Only trackable QR codes can have rules, aliases or a custom domain');
  return row;
}

/** Updates the rules; fields left out keep their value, `null` clears them. */
export async function updateRules(workspaceId: string, qrId: string, input: unknown) {
  const parsed = rulesInputSchema.safeParse(input);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message && !parsed.error.issues[0].message.startsWith('Invalid') ? parsed.error.issues[0].message : 'Check the rules');
  const row = await trackedCode(workspaceId, qrId);
  const current = (row.rules ?? {}) as StoredRules;
  const next: StoredRules = { ...current };
  if (parsed.data.password !== undefined) {
    // Linked codes open public pages that work without the code; a password there would give false protection.
    if (parsed.data.password !== null && isLinkedQRType(row.qrType)) throw new HttpError(409, 'Linked QR codes open public pages, so a password would not protect them');
    if (parsed.data.password === null) { delete next.passwordHash; delete next.passwordSalt; }
    else Object.assign(next, await hashPassword(parsed.data.password));
  }
  if (parsed.data.schedule !== undefined) next.schedule = parsed.data.schedule;
  if (parsed.data.fallbackUrl !== undefined) {
    if (parsed.data.fallbackUrl && !safeDestination(parsed.data.fallbackUrl)) throw new HttpError(400, 'Enter a valid HTTP/HTTPS fallback address');
    next.fallbackUrl = parsed.data.fallbackUrl ? new URL(parsed.data.fallbackUrl).href : null;
  }
  if (parsed.data.askLocation !== undefined) next.askLocation = parsed.data.askLocation;
  const [updated] = await getDb().update(qrCodes).set({ rules: next, updatedAt: new Date() })
    .where(and(eq(qrCodes.userId, workspaceId), eq(qrCodes.id, qrId))).returning();
  return rulesView(updated.rules);
}

export async function listAliases(workspaceId: string, qrId: string) {
  await trackedCode(workspaceId, qrId);
  const rows = await getDb().select({ alias: qrAliases.alias, created_at: qrAliases.createdAt }).from(qrAliases)
    .where(and(eq(qrAliases.userId, workspaceId), eq(qrAliases.qrCodeId, qrId))).orderBy(asc(qrAliases.createdAt));
  return rows.map(row => ({ alias: row.alias, created_at: row.created_at.toISOString() }));
}

/** Adds a readable short code. Aliases are permanent: they keep working and are never given to another code. */
export async function addAlias(workspaceId: string, qrId: string, input: unknown) {
  const parsed = z.object({ alias: z.string().trim().toLowerCase() }).strict().safeParse(input);
  if (!parsed.success || !validAlias(parsed.data.alias)) throw new HttpError(400, 'Use 3–32 lowercase letters, numbers or hyphens');
  await trackedCode(workspaceId, qrId);
  return getDb().transaction(async tx => {
    const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` }).from(qrAliases).where(eq(qrAliases.qrCodeId, qrId));
    if (total >= 10) throw new HttpError(409, 'A QR code can have up to 10 aliases');
    const [taken] = await tx.select({ id: qrCodes.id }).from(qrCodes).where(eq(qrCodes.shortCode, parsed.data.alias));
    if (taken) throw new HttpError(409, 'This alias is already taken');
    const [row] = await tx.insert(qrAliases).values({ alias: parsed.data.alias, qrCodeId: qrId, userId: workspaceId }).onConflictDoNothing().returning();
    if (!row) throw new HttpError(409, 'This alias is already taken');
    return { alias: row.alias, created_at: row.createdAt.toISOString() };
  });
}

/** Prints the code with a verified custom domain of the same workspace, or with the app address (`null`). */
export async function setTrackingDomain(workspaceId: string, qrId: string, input: unknown) {
  const parsed = z.object({ domain_id: z.union([z.uuid(), z.null()]) }).strict().safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Choose a domain');
  await trackedCode(workspaceId, qrId);
  let host: string | null = null;
  if (parsed.data.domain_id) {
    const [domain] = await getDb().select({ hostname: customDomains.hostname, verifiedAt: customDomains.verifiedAt }).from(customDomains)
      .where(and(eq(customDomains.userId, workspaceId), eq(customDomains.id, parsed.data.domain_id)));
    if (!domain) throw new HttpError(404, 'Domain not found');
    if (!domain.verifiedAt) throw new HttpError(409, 'Verify the domain before using it');
    host = domain.hostname;
    await getDb().update(customDomains).set({ everUsed: true }).where(eq(customDomains.id, parsed.data.domain_id));
  }
  const [updated] = await getDb().update(qrCodes).set({ trackingHost: host, updatedAt: new Date() })
    .where(and(eq(qrCodes.userId, workspaceId), eq(qrCodes.id, qrId))).returning({ trackingHost: qrCodes.trackingHost });
  return { tracking_host: updated.trackingHost };
}

/**
 * Checks a password under a per-code lock, so parallel guesses cannot pass the limits: at most 5 wrong tries per
 * trusted address and 50 per code in 10 minutes. Without a trusted proxy only the per-code limit applies, which can
 * pause a code for everyone for a few minutes; that is the accepted trade-off against guessing.
 */
export async function checkPassword(qrId: string, ipAddress: string | null, rules: StoredRules, password: string | undefined) {
  const ok = await getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'unlock:' + qrId}))`);
    const { rows } = await tx.execute<{ code: number; same: number }>(sql`select count(*)::int as code,
        count(*) filter (where ${ipAddress}::text is not null and ip_address = ${ipAddress})::int as same
      from qrconnect.qr_unlock_failures where qr_code_id = ${qrId} and occurred_at >= now() - interval '10 minutes'`);
    if (rows[0].code >= 50 || rows[0].same >= 5) throw new HttpError(429, 'Too many wrong passwords. Try again in a few minutes.');
    if (password && await passwordMatches(rules, password)) return true;
    await tx.insert(qrUnlockFailures).values({ qrCodeId: qrId, ipAddress });
    // Old attempts are not needed after the window.
    await tx.execute(sql`delete from qrconnect.qr_unlock_failures where qr_code_id = ${qrId} and occurred_at < now() - interval '1 day'`);
    return false;
  });
  if (!ok) throw new HttpError(403, 'The password is not correct');
}
