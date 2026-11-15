'use client';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { assetRequest } from '@/lib/asset-client';
import { apiScopes, webhookEvents, type ApiKeyRecord, type ApiScope, type DeliveryRecord, type WebhookEvent, type WebhookRecord } from '@/lib/developers';

const field = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';

function Secret({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation('developers');
  return <div role="status" className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
    <p className="font-medium">{t('{{label}} — copy it now; it will not be shown again.', { label })}</p>
    <div className="flex flex-wrap items-center gap-2"><code className="min-w-0 flex-1 break-all" dir="ltr">{value}</code>
      <Button size="sm" variant="outline" onClick={() => void navigator.clipboard?.writeText(value)}><Copy className="me-1 size-4" aria-hidden="true" />{t('Copy')}</Button></div>
  </div>;
}

/** Public API keys and outgoing webhooks of the workspace. */
export default function Developers({ keys, hooks, origin }: { keys: ApiKeyRecord[]; hooks: WebhookRecord[]; origin: string }) {
  const { t, i18n } = useTranslation('developers');
  const router = useRouter();
  const id = useId();
  const dates = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [newKey, setNewKey] = useState<{ name: string; scopes: ApiScope[] }>({ name: '', scopes: ['qr:read'] });
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [newHook, setNewHook] = useState<{ url: string; events: WebhookEvent[] }>({ url: 'https://', events: ['qr.scanned'] });
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, DeliveryRecord[]>>({});

  async function run(path: string, method: 'POST' | 'PATCH' | 'DELETE', body: unknown, success: string, after?: (value: Record<string, unknown>) => void) {
    setMessage(null);
    const result = await assetRequest(path, method, body);
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
    after?.(result.value);
    setMessage({ tone: 'success', text: t(success) });
    router.refresh();
  }
  async function loadDeliveries(hookId: string) {
    const response = await fetch(`/api/developers/webhooks/${hookId}`);
    if (response.ok) { const body = await response.json(); setDeliveries(previous => ({ ...previous, [hookId]: body.deliveries })); }
  }
  const toggle = <T extends string>(list: T[], value: T) => list.includes(value) ? list.filter(item => item !== value) : [...list, value];

  return <WorkspaceShell>
    <main className="space-y-8 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('API and webhooks')}</h1>
        <p className="text-sm text-muted-foreground">{t('Connect other systems to this workspace. Keys and webhooks belong to the workspace, not to a person.')}</p>
      </div>
      {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${message.tone === 'error' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-emerald-500/40 bg-emerald-500/10'}`}>{message.text}</p>}

      <section aria-labelledby={`${id}-keys`} className="space-y-4 rounded-md border bg-card p-4 shadow-sm">
        <h2 id={`${id}-keys`} className="text-lg font-semibold">{t('API keys')}</h2>
        <p className="text-sm text-muted-foreground">{t('Send the key as a Bearer token to {{url}}. Each key allows 60 requests per minute.', { url: `${origin}/api/v1` })}</p>
        <form className="space-y-3" onSubmit={event => { event.preventDefault();
          void run('/api/developers/keys', 'POST', newKey, 'API key created.', value => { setCreatedKey(String(value.key)); setNewKey({ name: '', scopes: ['qr:read'] }); }); }}>
          <div className="space-y-1"><label htmlFor={`${id}-key-name`} className="block text-sm font-medium">{t('Key name')}</label>
            <input id={`${id}-key-name`} className={`${field} max-w-sm`} maxLength={60} value={newKey.name} onChange={event => setNewKey({ ...newKey, name: event.target.value })} dir="auto" /></div>
          <fieldset><legend className="text-sm font-medium">{t('Permissions')}</legend>
            <div className="mt-1 flex flex-wrap gap-3">{apiScopes.map(scope => <label key={scope} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={newKey.scopes.includes(scope)} onChange={() => setNewKey({ ...newKey, scopes: toggle(newKey.scopes, scope) })} />
              <code dir="ltr">{scope}</code></label>)}</div></fieldset>
          <Button type="submit" disabled={!newKey.name.trim() || !newKey.scopes.length}>{t('Create key')}</Button>
        </form>
        {createdKey && <Secret label={t('API key')} value={createdKey} />}
        {keys.length === 0 ? <p className="text-sm text-muted-foreground">{t('No API keys yet.')}</p>
          : <ul className="divide-y text-sm">{keys.map(key => <li key={key.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span><span className="font-medium" dir="auto">{key.name}</span> <code className="ms-2 text-xs text-muted-foreground" dir="ltr">qrc_{key.prefix}_…</code>
              <span className="block text-xs text-muted-foreground" dir="ltr">{key.scopes.join(', ')} · {key.last_used_at ? t('last used {{date}}', { date: dates.format(new Date(key.last_used_at)) }) : t('never used')}</span></span>
            {key.revoked_at ? <span className="text-xs text-muted-foreground">{t('Revoked')}</span>
              : <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(t('Revoke "{{name}}"? Systems using it stop working immediately.', { name: key.name })))
                void run(`/api/developers/keys/${key.id}`, 'DELETE', undefined, 'API key revoked.'); }}>{t('Revoke')}</Button>}
          </li>)}</ul>}
      </section>

      <section aria-labelledby={`${id}-hooks`} className="space-y-4 rounded-md border bg-card p-4 shadow-sm">
        <h2 id={`${id}-hooks`} className="text-lg font-semibold">{t('Webhooks')}</h2>
        <p className="text-sm text-muted-foreground">{t('QRConnect sends a signed POST to your HTTPS address. Check the QRConnect-Signature header (HMAC-SHA256 of "timestamp.body") and ignore events older than 5 minutes or with an id you already processed.')}</p>
        <form className="space-y-3" onSubmit={event => { event.preventDefault();
          void run('/api/developers/webhooks', 'POST', newHook, 'Webhook created.', value => { setCreatedSecret(String(value.secret)); setNewHook({ url: 'https://', events: ['qr.scanned'] }); }); }}>
          <div className="space-y-1"><label htmlFor={`${id}-hook-url`} className="block text-sm font-medium">{t('Receiver address')}</label>
            <input id={`${id}-hook-url`} type="url" className={`${field} max-w-lg`} value={newHook.url} onChange={event => setNewHook({ ...newHook, url: event.target.value })} dir="ltr" /></div>
          <fieldset><legend className="text-sm font-medium">{t('Events')}</legend>
            <div className="mt-1 flex flex-wrap gap-3">{webhookEvents.map(event => <label key={event} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={newHook.events.includes(event)} onChange={() => setNewHook({ ...newHook, events: toggle(newHook.events, event) })} />
              <code dir="ltr">{event}</code></label>)}</div></fieldset>
          <Button type="submit" disabled={!newHook.events.length}>{t('Create webhook')}</Button>
        </form>
        {createdSecret && <Secret label={t('Signing secret')} value={createdSecret} />}
        {hooks.length === 0 ? <p className="text-sm text-muted-foreground">{t('No webhooks yet.')}</p>
          : <ul className="space-y-3">{hooks.map(hook => <li key={hook.id} className="space-y-2 rounded-md border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 break-all font-medium" dir="ltr">{hook.url}</span>
              <span className="text-xs text-muted-foreground" dir="ltr">{hook.events.join(', ')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2"><input type="checkbox" className="size-4" checked={hook.active}
                onChange={event => void run(`/api/developers/webhooks/${hook.id}`, 'PATCH', { active: event.target.checked }, event.target.checked ? 'Webhook turned on.' : 'Webhook paused.')} />{t('Active')}</label>
              <Button size="sm" variant="outline" onClick={() => void run(`/api/developers/webhooks/${hook.id}/ping`, 'POST', undefined, 'Test event sent.', () => void loadDeliveries(hook.id))}>{t('Send test event')}</Button>
              <Button size="sm" variant="outline" onClick={() => void loadDeliveries(hook.id)}>{t('Show deliveries')}</Button>
              <Button size="sm" variant="ghost" aria-label={t('Delete webhook {{url}}', { url: hook.url })} onClick={() => { if (window.confirm(t('Delete this webhook? Pending deliveries are dropped.')))
                void run(`/api/developers/webhooks/${hook.id}`, 'DELETE', undefined, 'Webhook deleted.'); }}><Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button>
            </div>
            {deliveries[hook.id] && (deliveries[hook.id].length === 0 ? <p className="text-xs text-muted-foreground">{t('No deliveries yet.')}</p>
              : <table className="w-full text-xs"><thead><tr className="text-muted-foreground">
                  {['Event', 'Status', 'Attempts', 'Answer', 'Created'].map(header => <th key={header} scope="col" className="py-1 text-start font-medium">{t(header)}</th>)}
                  <th scope="col"><span className="sr-only">{t('Actions')}</span></th></tr></thead>
                <tbody>{deliveries[hook.id].map(delivery => <tr key={delivery.id} className="border-t">
                  <td className="py-1" dir="ltr">{delivery.event}</td><td>{t(delivery.status)}</td><td>{delivery.attempts}</td>
                  <td dir="ltr">{delivery.last_status_code ?? delivery.last_error ?? '—'}</td><td>{dates.format(new Date(delivery.created_at))}</td>
                  <td className="text-end"><Button size="sm" variant="ghost" onClick={() => void run(`/api/developers/deliveries/${delivery.id}`, 'POST', undefined, 'Delivery sent again.', () => void loadDeliveries(hook.id))}>{t('Send again')}</Button></td>
                </tr>)}</tbody></table>)}
          </li>)}</ul>}
      </section>
    </main>
  </WorkspaceShell>;
}
