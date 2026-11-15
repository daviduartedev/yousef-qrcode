import 'server-only';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { webhookDeliveries, webhooks } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import { encrypt } from '@/server/webhooks';
import { connectorInput, connectorKinds, integrationLimit, type ConnectorKind, type IntegrationRecord } from '@/lib/integrations';
import type { WebhookEvent } from '@/lib/developers';

const defaultLabels: Record<ConnectorKind, string> = { slack: 'Slack', hubspot: 'HubSpot', ga4: 'Google Analytics 4' };

/** Connected integrations of the workspace with their latest delivery. Credentials never leave the server. */
export async function listIntegrations(workspaceId: string): Promise<IntegrationRecord[]> {
  const rows = await getDb().select().from(webhooks).where(and(eq(webhooks.userId, workspaceId), ne(webhooks.kind, 'webhook'))).orderBy(desc(webhooks.createdAt));
  if (!rows.length) return [];
  const latest = await getDb().selectDistinctOn([webhookDeliveries.webhookId], {
    hookId: webhookDeliveries.webhookId, status: webhookDeliveries.status, error: webhookDeliveries.lastError, at: webhookDeliveries.createdAt,
  }).from(webhookDeliveries).where(inArray(webhookDeliveries.webhookId, rows.map(row => row.id))).orderBy(webhookDeliveries.webhookId, desc(webhookDeliveries.createdAt));
  return rows.map(row => {
    const last = latest.find(item => item.hookId === row.id);
    return { id: row.id, kind: row.kind as ConnectorKind, label: row.label ?? defaultLabels[row.kind as ConnectorKind], events: row.events as WebhookEvent[], active: row.active,
      created_at: row.createdAt.toISOString(), hint: row.config.hint ?? '', last_status: (last?.status as IntegrationRecord['last_status']) ?? null,
      last_error: last?.error ?? null, last_at: last?.at.toISOString() ?? null };
  });
}

/** Connects a connector. The credential is stored encrypted and only a short hint is ever shown again. */
export async function createIntegration(workspaceId: string, input: unknown) {
  const parsed = connectorInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message && !parsed.error.issues[0].message.startsWith('Invalid') ? parsed.error.issues[0].message : 'Check the connection settings');
  const data = parsed.data;
  const credential = data.kind === 'slack' ? data.webhookUrl : data.kind === 'hubspot' ? data.token : data.apiSecret;
  const hint = data.kind === 'ga4' ? data.measurementId : `…${credential.slice(-4)}`;
  const config: Record<string, string> = { hint, ...(data.kind === 'ga4' ? { measurementId: data.measurementId } : {}) };
  const url = data.kind === 'slack' ? 'https://hooks.slack.com' : data.kind === 'hubspot' ? 'https://api.hubapi.com' : 'https://www.google-analytics.com';
  return getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'webhooks:' + workspaceId}))`);
    const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` }).from(webhooks).where(and(eq(webhooks.userId, workspaceId), inArray(webhooks.kind, [...connectorKinds])));
    if (total >= integrationLimit) throw new HttpError(409, 'You reached the integration limit');
    const [row] = await tx.insert(webhooks).values({ userId: workspaceId, kind: data.kind, label: data.label?.trim() || null, url, events: [...new Set(data.events)],
      secretEncrypted: encrypt(credential), config }).returning({ id: webhooks.id });
    return { id: row.id };
  });
}
