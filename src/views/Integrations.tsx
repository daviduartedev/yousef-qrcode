'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { assetRequest } from '@/lib/asset-client';
import { connectorEvents, type ConnectorKind, type IntegrationRecord } from '@/lib/integrations';
import type { DeliveryRecord, WebhookEvent } from '@/lib/developers';

const field = 'min-h-11 w-full max-w-lg rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';

type Catalog = { kind: ConnectorKind | 'automation'; name: string; description: string; product: 'qr' | 'cards' | 'both' };
const catalog: Catalog[] = [
  { kind: 'slack', name: 'Slack', description: 'Post scans, form responses and card contacts to a Slack channel. Answers and contact details appear in the channel.', product: 'both' },
  { kind: 'ga4', name: 'Google Analytics 4', description: 'Send a qr_scan event to your GA4 property for every counted scan.', product: 'qr' },
  { kind: 'hubspot', name: 'HubSpot CRM', description: 'Create HubSpot contacts from card contacts. Existing contacts with the same email are left unchanged.', product: 'cards' },
  { kind: 'automation', name: 'Zapier, Make and n8n', description: 'Use a signed webhook as the trigger of your automation.', product: 'both' },
];

/** Catalog and connections of the workspace's integrations. */
export default function Integrations({ integrations }: { integrations: IntegrationRecord[] }) {
  const { t, i18n } = useTranslation('integrations');
  const router = useRouter();
  const id = useId();
  const dates = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
  const [product, setProduct] = useState<'qr' | 'cards'>('qr');
  const [open, setOpen] = useState<ConnectorKind | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, DeliveryRecord[]>>({});

  async function run(path: string, method: 'POST' | 'PATCH' | 'DELETE', body: unknown, success: string, after?: (value: Record<string, unknown>) => void) {
    setMessage(null);
    const result = await assetRequest(path, method, body);
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return false; }
    after?.(result.value);
    setMessage({ tone: 'success', text: t(success) });
    router.refresh();
    return true;
  }
  async function loadDeliveries(itemId: string) {
    const response = await fetch(`/api/integrations/${itemId}`);
    if (response.ok) { const body = await response.json(); setDeliveries(previous => ({ ...previous, [itemId]: body.deliveries })); }
  }
  function start(kind: ConnectorKind) { setOpen(kind); setForm({}); setEvents([...connectorEvents[kind]]); setMessage(null); }
  const toggle = (event: WebhookEvent) => setEvents(list => list.includes(event) ? list.filter(item => item !== event) : [...list, event]);
  const shown = catalog.filter(item => item.product === 'both' || item.product === product);
  const status = (item: IntegrationRecord) => item.last_status === null ? t('No events yet') : item.last_status === 'delivered' ? t('Working')
    : item.last_status === 'pending' ? t('Retrying') : item.last_status === 'skipped' ? t('Skipped last event') : t('Failing');

  return <WorkspaceShell>
    <main className="space-y-6 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('Integrations')}</h1>
        <p className="text-sm text-muted-foreground">{t('Send QRConnect events to the tools your team already uses. Credentials are stored encrypted and never shown again.')}</p>
      </div>
      {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${message.tone === 'error' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-emerald-500/40 bg-emerald-500/10'}`}>{message.text}</p>}

      <div role="tablist" aria-label={t('Product')} className="inline-flex rounded-md border p-1">
        {(['qr', 'cards'] as const).map(value => <button key={value} role="tab" type="button" aria-selected={product === value}
          className={`min-h-9 rounded px-3 text-sm ${product === value ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => { setProduct(value); setOpen(null); }}>
          {value === 'qr' ? t('QR Codes') : t('Cards')}</button>)}
      </div>

      <ul className="grid gap-4 md:grid-cols-2">{shown.map(item => <li key={item.kind} className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">{item.name}</h2>
        <p className="text-sm text-muted-foreground">{t(item.description)}</p>
        {item.kind === 'automation'
          ? <Button asChild variant="outline" size="sm"><Link href="/settings/developers">{t('Set up a webhook')}</Link></Button>
          : <Button size="sm" variant="outline" aria-expanded={open === item.kind} onClick={() => start(item.kind as ConnectorKind)}>{t('Connect')}</Button>}
        {open !== null && open === item.kind && <form className="space-y-3 border-t pt-3" onSubmit={async event => {
          event.preventDefault();
          const ok = await run('/api/integrations', 'POST', { kind: item.kind, events, label: form.label || undefined,
            ...(item.kind === 'slack' ? { webhookUrl: form.webhookUrl ?? '' } : item.kind === 'hubspot' ? { token: form.token ?? '' } : { measurementId: form.measurementId ?? '', apiSecret: form.apiSecret ?? '' }) }, 'Integration connected.');
          if (ok) setOpen(null);
        }}>
          <div className="space-y-1"><label htmlFor={`${id}-label`} className="block text-sm font-medium">{t('Name (optional)')}</label>
            <input id={`${id}-label`} className={field} maxLength={80} dir="auto" value={form.label ?? ''} onChange={event => setForm({ ...form, label: event.target.value })} /></div>
          {item.kind === 'slack' && <div className="space-y-1"><label htmlFor={`${id}-slack`} className="block text-sm font-medium">{t('Slack incoming webhook address')}</label>
            <input id={`${id}-slack`} type="url" required dir="ltr" className={field} placeholder="https://hooks.slack.com/services/…" autoComplete="off" value={form.webhookUrl ?? ''} onChange={event => setForm({ ...form, webhookUrl: event.target.value })} /></div>}
          {item.kind === 'hubspot' && <div className="space-y-1"><label htmlFor={`${id}-hubspot`} className="block text-sm font-medium">{t('HubSpot private app token')}</label>
            <input id={`${id}-hubspot`} type="password" required dir="ltr" className={field} autoComplete="off" value={form.token ?? ''} onChange={event => setForm({ ...form, token: event.target.value })} />
            <p className="text-xs text-muted-foreground">{t('The private app needs the crm.objects.contacts.read and crm.objects.contacts.write scopes. Only contacts who agreed to share their details on the card are sent.')}</p></div>}
          {item.kind === 'ga4' && <>
            <div className="space-y-1"><label htmlFor={`${id}-mid`} className="block text-sm font-medium">{t('Measurement ID')}</label>
              <input id={`${id}-mid`} required dir="ltr" className={field} placeholder="G-XXXXXXX" value={form.measurementId ?? ''} onChange={event => setForm({ ...form, measurementId: event.target.value })} /></div>
            <div className="space-y-1"><label htmlFor={`${id}-secret`} className="block text-sm font-medium">{t('Measurement Protocol API secret')}</label>
              <input id={`${id}-secret`} type="password" required dir="ltr" className={field} autoComplete="off" value={form.apiSecret ?? ''} onChange={event => setForm({ ...form, apiSecret: event.target.value })} />
              <p className="text-xs text-muted-foreground">{t('The connection test checks the event format only; Google does not confirm the secret. Check the event in GA4 Realtime after a scan.')}</p></div></>}
          <fieldset><legend className="text-sm font-medium">{t('Events')}</legend>
            <div className="mt-1 flex flex-wrap gap-3">{connectorEvents[item.kind as ConnectorKind].map(event => <label key={event} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={events.includes(event)} onChange={() => toggle(event)} /><code dir="ltr">{event}</code></label>)}</div></fieldset>
          <div className="flex gap-2"><Button type="submit" disabled={!events.length}>{t('Save connection')}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(null)}>{t('Cancel')}</Button></div>
        </form>}
      </li>)}</ul>

      <section aria-labelledby={`${id}-connected`} className="space-y-3">
        <h2 id={`${id}-connected`} className="text-lg font-semibold">{t('Connected')}</h2>
        {integrations.length === 0 ? <p className="text-sm text-muted-foreground">{t('No integrations connected yet.')}</p>
          : <ul className="space-y-3">{integrations.map(item => <li key={item.id} className="space-y-2 rounded-md border bg-card p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span><span className="font-medium" dir="auto">{item.label}</span> <code className="ms-2 text-xs text-muted-foreground" dir="ltr">{item.hint}</code></span>
              <span className="text-xs text-muted-foreground"><span dir="ltr">{item.events.join(', ')}</span> · {status(item)}{item.last_at ? ` · ${dates.format(new Date(item.last_at))}` : ''}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2"><input type="checkbox" className="size-4" checked={item.active}
                onChange={event => void run(`/api/integrations/${item.id}`, 'PATCH', { active: event.target.checked }, event.target.checked ? 'Integration turned on.' : 'Integration paused.')} />{t('Active')}</label>
              <Button size="sm" variant="outline" onClick={() => void run(`/api/integrations/${item.id}/test`, 'POST', undefined, 'Test sent. Check the result below.', () => void loadDeliveries(item.id))}>{t('Test connection')}</Button>
              <Button size="sm" variant="outline" onClick={() => void loadDeliveries(item.id)}>{t('Show deliveries')}</Button>
              <Button size="sm" variant="ghost" aria-label={t('Disconnect {{name}}', { name: item.label })} onClick={() => { if (window.confirm(t('Disconnect this integration? The stored credential is erased.')))
                void run(`/api/integrations/${item.id}`, 'DELETE', undefined, 'Integration disconnected.'); }}><Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button>
            </div>
            {deliveries[item.id] && (deliveries[item.id].length === 0 ? <p className="text-xs text-muted-foreground">{t('No events yet')}</p>
              : <table className="w-full text-xs"><thead><tr className="text-muted-foreground">
                  {['Event', 'Status', 'Attempts', 'Answer', 'Created'].map(header => <th key={header} scope="col" className="py-1 text-start font-medium">{t(header)}</th>)}
                  <th scope="col"><span className="sr-only">{t('Actions')}</span></th></tr></thead>
                <tbody>{deliveries[item.id].map(delivery => <tr key={delivery.id} className="border-t">
                  <td className="py-1" dir="ltr">{delivery.event}</td><td>{t(delivery.status)}</td><td>{delivery.attempts}</td>
                  <td dir="ltr">{delivery.last_status_code ?? (delivery.last_error ? t(delivery.last_error) : '—')}</td><td>{dates.format(new Date(delivery.created_at))}</td>
                  <td className="text-end"><Button size="sm" variant="ghost" onClick={() => void run(`/api/integrations/deliveries/${delivery.id}`, 'POST', undefined, 'Delivery sent again.', () => void loadDeliveries(item.id))}>{t('Send again')}</Button></td>
                </tr>)}</tbody></table>)}
          </li>)}</ul>}
      </section>
    </main>
  </WorkspaceShell>;
}
