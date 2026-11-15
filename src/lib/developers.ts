/** Shared contract of the public API and webhooks. */
export const apiScopes = ['qr:read', 'qr:write', 'analytics:read'] as const;
export type ApiScope = (typeof apiScopes)[number];
export const webhookEvents = ['qr.scanned', 'form.submitted', 'card.contact'] as const;
export type WebhookEvent = (typeof webhookEvents)[number];

export const apiLimits = { requestsPerMinute: 60, keysPerWorkspace: 20, webhooksPerWorkspace: 10, maxAttempts: 6, maxPendingPerWebhook: 500, timeoutMs: 5000, replayWindowSeconds: 300 } as const;

/** Waits between delivery attempts: 1 min, 5 min, 30 min, 2 h, 6 h. */
export const retryDelaysSeconds = [60, 300, 1800, 7200, 21600] as const;

/** IPv4 carried inside an IPv6 address (mapped, compatible, 6to4); 'unknown' when it cannot be read. */
function embeddedIPv4(v6: string): string | 'unknown' | null {
  const dotted = /^(?:::ffff:|::ffff:0:|::)(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
  if (dotted) return dotted[1];
  const hexPair = (a: string, b: string) => { const x = parseInt(a, 16), y = parseInt(b, 16); return [x >> 8, x & 255, y >> 8, y & 255].join('.'); };
  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(v6);
  if (mapped) return hexPair(mapped[1], mapped[2]);
  const sixToFour = /^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})(?::|$)/.exec(v6);
  if (sixToFour) return hexPair(sixToFour[1], sixToFour[2]);
  if (v6.startsWith('2002:')) return 'unknown';
  return null;
}

export type ApiKeyRecord = { id: string; name: string; prefix: string; scopes: ApiScope[]; created_at: string; last_used_at: string | null; revoked_at: string | null };
export type WebhookRecord = { id: string; url: string; events: WebhookEvent[]; active: boolean; created_at: string };
export type DeliveryRecord = { id: string; event_id: string; event: string; status: 'pending' | 'delivered' | 'failed' | 'skipped'; attempts: number; last_status_code: number | null; last_error: string | null; created_at: string; delivered_at: string | null; next_attempt_at: string | null };

/** IPv4/IPv6 ranges a webhook may never reach: loopback, private, link-local, carrier NAT, multicast and reserved. */
export function blockedAddress(address: string): boolean {
  const lower = address.toLowerCase();
  const embedded = embeddedIPv4(lower);
  if (embedded) return embedded === 'unknown' || blockedAddress(embedded);
  const v4 = lower;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) {
    const [a, b] = v4.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const v6 = address.toLowerCase();
  return v6 === '::' || v6 === '::1' || v6.startsWith('100:') || v6.startsWith('2001:0:') || /^2001:0?0?0?0?:/.test(v6) || /^fe[c-f]/.test(v6) || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea')
    || v6.startsWith('feb') || v6.startsWith('ff') || v6.startsWith('2001:db8') || v6.startsWith('64:ff9b');
}
