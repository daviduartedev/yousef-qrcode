/** Shared contract of the public API and webhooks. */
export const apiScopes = ['qr:read', 'qr:write', 'analytics:read'] as const;
export type ApiScope = (typeof apiScopes)[number];
export const webhookEvents = ['qr.scanned', 'form.submitted', 'card.contact'] as const;
export type WebhookEvent = (typeof webhookEvents)[number];

export const apiLimits = { requestsPerMinute: 60, keysPerWorkspace: 20, webhooksPerWorkspace: 10, maxAttempts: 6, timeoutMs: 5000, replayWindowSeconds: 300 } as const;

/** Waits between delivery attempts: 1 min, 5 min, 30 min, 2 h, 6 h. */
export const retryDelaysSeconds = [60, 300, 1800, 7200, 21600] as const;

export type ApiKeyRecord = { id: string; name: string; prefix: string; scopes: ApiScope[]; created_at: string; last_used_at: string | null; revoked_at: string | null };
export type WebhookRecord = { id: string; url: string; events: WebhookEvent[]; active: boolean; created_at: string };
export type DeliveryRecord = { id: string; event_id: string; event: string; status: 'pending' | 'delivered' | 'failed'; attempts: number; last_status_code: number | null; last_error: string | null; created_at: string; delivered_at: string | null; next_attempt_at: string | null };

/** IPv4/IPv6 ranges a webhook may never reach: loopback, private, link-local, carrier NAT, multicast and reserved. */
export function blockedAddress(address: string) {
  const v4 = address.startsWith('::ffff:') ? address.slice(7) : address;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) {
    const [a, b] = v4.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  const v6 = address.toLowerCase();
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea')
    || v6.startsWith('feb') || v6.startsWith('ff') || v6.startsWith('2001:db8') || v6.startsWith('64:ff9b');
}
