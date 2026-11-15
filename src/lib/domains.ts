/** Custom short-link domains: ownership is proven with a DNS TXT record before any QR can use the domain. */
export const domainPattern = /^(?=.{4,253}$)(?!-)(?:[a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;
export const verificationRecord = (hostname: string) => `_qrconnect.${hostname}`;
export const verificationValue = (token: string) => `qrconnect-verify=${token}`;

/** Normalizes user input to a bare lowercase hostname, or null when it is not a usable public domain. */
export function normalizeHostname(value: string, appHost: string) {
  let host = value.trim().toLowerCase();
  try { if (/^[a-z]+:\/\//.test(host)) host = new URL(host).hostname; } catch { return null; }
  host = host.replace(/\.$/, '');
  if (!domainPattern.test(host)) return null;
  if (host === appHost || host.endsWith('.vercel.app') || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.test') || host.endsWith('.local')) return null;
  return host;
}

/** True when one of the TXT records (each may be split into chunks) carries the expected value. */
export function txtMatches(records: string[][], token: string) {
  const expected = verificationValue(token);
  return records.some(chunks => chunks.join('').trim() === expected);
}

export type DomainRecord = { id: string; hostname: string; verified_at: string | null; record_name: string; record_value: string; qr_codes: number; created_at: string };
