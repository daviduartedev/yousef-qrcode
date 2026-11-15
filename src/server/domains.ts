import 'server-only';
import { randomBytes } from 'node:crypto';
import { resolveTxt } from 'node:dns/promises';
import { readFile } from 'node:fs/promises';
import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { customDomains, qrCodes } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import { getServerEnv } from '@/server/env';
import { normalizeHostname, txtMatches, verificationRecord, verificationValue, type DomainRecord } from '@/lib/domains';

const id = z.uuid();
const maxDomains = 10;

function loopbackTests() {
  const host = new URL(getServerEnv().appUrl).hostname;
  return ['localhost', '127.0.0.1', '[::1]'].includes(host) && !process.env.VERCEL;
}

/**
 * TXT lookup. Automated local tests may point `DNS_TXT_FIXTURES` at a JSON file of records; that path is refused
 * outside a loopback origin, like the email outbox.
 */
async function lookupTxt(name: string): Promise<string[][]> {
  const fixtures = process.env.DNS_TXT_FIXTURES;
  if (fixtures) {
    if (!loopbackTests()) throw new Error('DNS fixtures only run on a loopback origin.');
    const records = JSON.parse(await readFile(fixtures, 'utf8').catch(() => '{}')) as Record<string, string[][]>;
    return records[name] ?? [];
  }
  try { return await resolveTxt(name); } catch { return []; }
}

const usage = sql<number>`(select count(*)::int from qrconnect.qr_codes q where q.user_id = "custom_domains"."user_id" and q.tracking_host = "custom_domains"."hostname")`;

function record(row: typeof customDomains.$inferSelect & { uses?: number }): DomainRecord {
  return {
    id: row.id, hostname: row.hostname, verified_at: row.verifiedAt?.toISOString() ?? null,
    record_name: verificationRecord(row.hostname), record_value: verificationValue(row.verificationToken),
    qr_codes: row.uses ?? 0, created_at: row.createdAt.toISOString(),
  };
}

/** The TXT value is shown only to members who can manage domains. */
export async function listDomains(workspaceId: string, canManage = true) {
  const rows = await getDb().select({ domain: customDomains, uses: usage }).from(customDomains)
    .where(eq(customDomains.userId, workspaceId)).orderBy(asc(customDomains.hostname));
  return rows.map(({ domain, uses }) => ({ ...record({ ...domain, uses }), ...(canManage ? {} : { record_value: '' }) }));
}

export async function addDomain(workspaceId: string, input: unknown) {
  const parsed = z.object({ hostname: z.string().max(260) }).strict().safeParse(input);
  const hostname = parsed.success ? normalizeHostname(parsed.data.hostname, new URL(getServerEnv().appUrl).hostname) : null;
  if (!hostname) throw new HttpError(400, 'Enter a domain you own, such as qr.example.com');
  return getDb().transaction(async tx => {
    const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` }).from(customDomains).where(eq(customDomains.userId, workspaceId));
    if (total >= maxDomains) throw new HttpError(409, 'You reached the domain limit');
    const [verified] = await tx.select({ id: customDomains.id }).from(customDomains).where(and(eq(customDomains.hostname, hostname), isNotNull(customDomains.verifiedAt)));
    if (verified) throw new HttpError(409, 'This domain is already registered');
    const [row] = await tx.insert(customDomains).values({ userId: workspaceId, hostname, verificationToken: randomBytes(24).toString('base64url') })
      .onConflictDoNothing().returning();
    if (!row) throw new HttpError(409, 'This domain is already registered');
    return record(row);
  });
}

/** Checks the TXT record now; a verified domain stays verified until it is removed. */
export async function verifyDomain(workspaceId: string, domainId: string) {
  if (!id.safeParse(domainId).success) throw new HttpError(404, 'Domain not found');
  const [row] = await getDb().select().from(customDomains).where(and(eq(customDomains.userId, workspaceId), eq(customDomains.id, domainId)));
  if (!row) throw new HttpError(404, 'Domain not found');
  if (row.verifiedAt) return { domain: record(row), verified: true };
  const verified = txtMatches(await lookupTxt(verificationRecord(row.hostname)), row.verificationToken);
  // Pending claims of the same name by other workspaces lose once one of them proves ownership.
  if (verified) {
    const [other] = await getDb().select({ id: customDomains.id }).from(customDomains).where(and(eq(customDomains.hostname, row.hostname), isNotNull(customDomains.verifiedAt)));
    if (other) throw new HttpError(409, 'This domain is already registered');
  }
  const [updated] = await getDb().update(customDomains).set({ lastCheckedAt: new Date(), ...(verified ? { verifiedAt: new Date() } : {}) })
    .where(eq(customDomains.id, row.id)).returning();
  return { domain: record(updated), verified };
}

/** A domain printed in QR codes cannot be removed, or those codes would stop working. */
export async function deleteDomain(workspaceId: string, domainId: string) {
  if (!id.safeParse(domainId).success) throw new HttpError(404, 'Domain not found');
  return getDb().transaction(async tx => {
    const [row] = await tx.select().from(customDomains).where(and(eq(customDomains.userId, workspaceId), eq(customDomains.id, domainId))).for('update');
    if (!row) throw new HttpError(404, 'Domain not found');
    const [{ uses }] = await tx.select({ uses: sql<number>`count(*)::int` }).from(qrCodes).where(and(eq(qrCodes.userId, workspaceId), eq(qrCodes.trackingHost, row.hostname)));
    if (uses > 0 || row.everUsed) throw new HttpError(409, 'QR codes were printed with this domain, so it cannot be removed.');
    await tx.delete(customDomains).where(eq(customDomains.id, row.id));
    return { deleted: true };
  });
}
