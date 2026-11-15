'use client';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { assetRequest } from '@/lib/asset-client';
import type { DomainRecord } from '@/lib/domains';

const field = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';

/** Custom domains: add, prove ownership with a DNS TXT record, and remove when no QR code uses them. */
export default function Domains({ domains, canManage, appHost }: { domains: DomainRecord[]; canManage: boolean; appHost: string }) {
  const { t } = useTranslation('advanced');
  const router = useRouter();
  const id = useId();
  const [hostname, setHostname] = useState('');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  async function run(path: string, method: 'POST' | 'DELETE', body: unknown, done: (value: Record<string, unknown>) => string) {
    setMessage(null);
    const result = await assetRequest(path, method, body);
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
    setMessage({ tone: 'success', text: t(done(result.value)) });
    router.refresh();
  }

  return <WorkspaceShell>
    <main className="space-y-6 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('Custom domains')}</h1>
        <p className="text-sm text-muted-foreground">{t('Print QR codes with your own short-link domain, such as qr.example.com/r/menu.')}</p>
      </div>
      {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${message.tone === 'error' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-emerald-500/40 bg-emerald-500/10'}`}>{message.text}</p>}
      {canManage && <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault();
        void run('/api/domains', 'POST', { hostname }, () => 'Domain added. Create the DNS record below, then verify.').then(() => setHostname('')); }}>
        <label htmlFor={`${id}-host`} className="sr-only">{t('Domain')}</label>
        <input id={`${id}-host`} className={`${field} max-w-sm`} placeholder="qr.example.com" value={hostname} dir="ltr" onChange={event => setHostname(event.target.value)} />
        <Button type="submit" disabled={!hostname.trim()}>{t('Add domain')}</Button>
      </form>}
      {domains.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{t('No custom domains yet.')}</p>
        : <ul className="space-y-4">{domains.map(domain => <li key={domain.id} className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold" dir="ltr">{domain.hostname}</h2>
            <span className={`inline-flex items-center gap-1 text-sm ${domain.verified_at ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {domain.verified_at ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Clock className="size-4" aria-hidden="true" />}{t(domain.verified_at ? 'Verified' : 'Waiting for DNS')}</span>
          </div>
          {!domain.verified_at && <div className="space-y-2 text-sm">
            <p>{t('Create this TXT record at your DNS provider, then select Verify. DNS changes can take a while to appear.')}</p>
            <dl className="grid gap-1 rounded-md bg-muted p-3 font-mono text-xs sm:grid-cols-[6rem_minmax(0,1fr)]" dir="ltr">
              <dt>Type</dt><dd>TXT</dd><dt>Name</dt><dd className="break-all">{domain.record_name}</dd><dt>Value</dt><dd className="break-all">{domain.record_value}</dd>
            </dl>
          </div>}
          <p className="text-sm text-muted-foreground">{t('To serve scans, point the domain to the app with a CNAME record to {{host}} and add it to the hosting project so it gets a TLS certificate.', { host: appHost })}</p>
          <p className="text-sm">{t('{{count}} QR codes use this domain.', { count: domain.qr_codes })}</p>
          {canManage && <div className="flex flex-wrap gap-2">
            {!domain.verified_at && <Button size="sm" onClick={() => void run(`/api/domains/${domain.id}/verify`, 'POST', undefined,
              value => value.verified ? 'Domain verified. You can now use it in QR codes.' : 'The TXT record was not found yet. Try again later.')}>{t('Verify')}</Button>}
            <Button size="sm" variant="ghost" aria-label={t('Remove {{name}}', { name: domain.hostname })} onClick={() => {
              if (window.confirm(t('Remove {{name}}? QR codes printed with it will stop working.', { name: domain.hostname })))
                void run(`/api/domains/${domain.id}`, 'DELETE', undefined, () => 'Domain removed.');
            }}><Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button>
          </div>}
        </li>)}</ul>}
    </main>
  </WorkspaceShell>;
}
