import { z } from 'zod';
import type { WebhookEvent } from '@/lib/developers';

/** Connectors that QRConnect delivers to itself; Zapier, Make and n8n use the signed webhooks. */
export const connectorKinds = ['slack', 'hubspot', 'ga4'] as const;
export type ConnectorKind = typeof connectorKinds[number];

/** Events each connector can receive. HubSpot only receives card contacts, the one flow where the visitor consents to share details. */
export const connectorEvents: Record<ConnectorKind, readonly WebhookEvent[]> = {
  slack: ['qr.scanned', 'form.submitted', 'card.contact'],
  hubspot: ['card.contact'],
  ga4: ['qr.scanned'],
};

export const integrationLimit = 10;

/** Fixed hosts per connector: a credential can only ever be sent to its own service. */
export const connectorOrigins: Record<ConnectorKind, string> = {
  slack: 'https://hooks.slack.com',
  hubspot: 'https://api.hubapi.com',
  ga4: 'https://www.google-analytics.com',
};

const slackUrl = z.string().trim().max(300).regex(/^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]{10,200}$/, 'Paste the Slack incoming webhook address');
const hubspotToken = z.string().trim().regex(/^pat-[a-z0-9]{2,4}-[0-9a-f-]{36}$/i, 'Paste a HubSpot private app token');
const ga4 = { measurementId: z.string().trim().regex(/^G-[A-Z0-9]{4,16}$/, 'Enter a measurement ID like G-XXXXXXX'), apiSecret: z.string().trim().regex(/^[A-Za-z0-9_-]{8,64}$/, 'Enter the Measurement Protocol API secret') };

const events = (kind: ConnectorKind) => z.array(z.enum(connectorEvents[kind] as [WebhookEvent, ...WebhookEvent[]])).min(1).max(connectorEvents[kind].length);
const label = z.string().trim().max(80).optional();

export const connectorInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('slack'), label, events: events('slack'), webhookUrl: slackUrl }).strict(),
  z.object({ kind: z.literal('hubspot'), label, events: events('hubspot'), token: hubspotToken }).strict(),
  z.object({ kind: z.literal('ga4'), label, events: events('ga4'), measurementId: ga4.measurementId, apiSecret: ga4.apiSecret }).strict(),
]);
export type ConnectorInput = z.infer<typeof connectorInput>;

export type IntegrationRecord = { id: string; kind: ConnectorKind; label: string; events: WebhookEvent[]; active: boolean; created_at: string; hint: string;
  last_status: 'delivered' | 'failed' | 'pending' | 'skipped' | null; last_error: string | null; last_at: string | null };

/**
 * Slack message text for an event. Visitor values are escaped (no mentions or links) and kept on one line, so they cannot fake
 * extra lines; the message is sent with markdown turned off.
 */
export function slackText(event: string, data: Record<string, unknown>) {
  const plain = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').replace(/[<>&]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[char] as string)).trim().slice(0, 500);
  if (event === 'qr.scanned') return `QR code scanned: ${plain(data.title)} (${plain(data.short_code)}) · ${plain(data.device_type)}${data.country ? ' · ' + plain(data.country) : ''}`;
  if (event === 'form.submitted') {
    const answers = Array.isArray(data.answers) ? data.answers as { label?: unknown; value?: unknown }[] : [];
    return [`New response to ${plain(data.title)}`, ...answers.slice(0, 20).map(answer => `• ${plain(answer.label)}: ${plain(Array.isArray(answer.value) ? answer.value.join(', ') : answer.value)}`)].join('\n');
  }
  if (event === 'card.contact') return `New contact from a card: ${plain(data.name)}${data.email ? ' · ' + plain(data.email) : ''}${data.phone ? ' · ' + plain(data.phone) : ''}`;
  return `QRConnect test message`;
}

/**
 * New HubSpot contact from a card contact. Creation only: the visitor's email is not verified, so an existing CRM contact is never
 * changed (HubSpot answers 409 and the delivery is skipped). Empty values are not sent. Null when the contact left no email.
 */
export function hubspotContact(data: Record<string, unknown>) {
  const email = typeof data.email === 'string' && data.email ? data.email.toLowerCase() : null;
  if (!email) return null;
  const [firstname, ...rest] = String(data.name ?? '').trim().split(/\s+/);
  const values: Record<string, unknown> = { email, firstname, lastname: rest.join(' '), phone: data.phone, company: data.company };
  return { properties: Object.fromEntries(Object.entries(values).filter(([, value]) => typeof value === 'string' && value.trim()).map(([key, value]) => [key, String(value).trim()])) };
}

/** GA4 Measurement Protocol event for a counted scan. The client id is random per scan: no visitor tracking across scans. */
export function ga4Event(data: Record<string, unknown>, clientId: string) {
  return { client_id: clientId, non_personalized_ads: true, events: [{ name: 'qr_scan', params: {
    qr_code_id: String(data.qr_code_id ?? ''), short_code: String(data.short_code ?? ''), qr_title: String(data.title ?? '').slice(0, 100), device_type: String(data.device_type ?? ''),
  } }] };
}
