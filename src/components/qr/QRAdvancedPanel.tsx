'use client';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { assetRequest } from '@/lib/asset-client';
import type { QRRulesView, QRSchedule } from '@/lib/qr-rules';
import type { DomainRecord } from '@/lib/domains';
import type { QRCodeRecord } from '@/lib/qr-types';

const field = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const emptySchedule = (): QRSchedule => ({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', startsAt: null, endsAt: null, days: [], from: null, to: null });

/** Password, schedule with time zone and fallback, location consent, aliases and custom domain of a tracked QR. */
export function QRAdvancedPanel({ record, onChanged }: { record: QRCodeRecord; onChanged: (change: Partial<QRCodeRecord>) => void }) {
  const { t } = useTranslation('advanced');
  const id = useId();
  const rules: QRRulesView = record.rules ?? { hasPassword: false, schedule: null, fallbackUrl: null, askLocation: false };
  const [password, setPassword] = useState('');
  const [schedule, setSchedule] = useState<QRSchedule | null>(rules.schedule);
  const [fallback, setFallback] = useState(rules.fallbackUrl ?? '');
  const [aliases, setAliases] = useState<{ alias: string }[]>([]);
  const [alias, setAlias] = useState('');
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC'];

  useEffect(() => {
    let alive = true;
    void fetch(`/api/qr-codes/${record.id}/aliases`).then(response => response.ok ? response.json() : { aliases: [] }).then(body => { if (alive) setAliases(body.aliases); });
    void fetch('/api/domains').then(response => response.ok ? response.json() : { domains: [] }).then(body => { if (alive) setDomains(body.domains); });
    return () => { alive = false; };
  }, [record.id]);

  async function saveRules(body: Record<string, unknown>, success: string) {
    setMessage(null);
    const result = await assetRequest(`/api/qr-codes/${record.id}/rules`, 'PATCH', body);
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
    onChanged({ rules: result.value.rules });
    setMessage({ tone: 'success', text: t(success) });
  }

  const setPart = (change: Partial<QRSchedule>) => setSchedule(previous => ({ ...(previous ?? emptySchedule()), ...change }));
  return <section aria-labelledby={`${id}-title`} className="space-y-5 rounded-md border p-4">
    <h3 id={`${id}-title`} className="text-base font-semibold">{t('Advanced options')}</h3>
    {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'error' ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-300'}`}>{message.text}</p>}

    <fieldset className="space-y-2"><legend className="text-sm font-semibold">{t('Password')}</legend>
      <p className="text-xs text-muted-foreground">{t(rules.hasPassword ? 'People must enter the password before the code opens.' : 'Optional. People will need it before the code opens.')}</p>
      <div className="flex flex-wrap gap-2">
        <label htmlFor={`${id}-password`} className="sr-only">{t('New password')}</label>
        <input id={`${id}-password`} type="password" autoComplete="new-password" className={`${field} max-w-xs`} value={password} minLength={4} maxLength={128}
          placeholder={t(rules.hasPassword ? 'New password' : 'Password')} onChange={event => setPassword(event.target.value)} dir="ltr" />
        <Button type="button" variant="outline" disabled={password.length < 4} onClick={() => void saveRules({ password }, 'Password saved.').then(() => setPassword(''))}>{t('Save password')}</Button>
        {rules.hasPassword && <Button type="button" variant="ghost" onClick={() => void saveRules({ password: null }, 'Password removed.')}>{t('Remove password')}</Button>}
      </div>
    </fieldset>

    <fieldset className="space-y-3"><legend className="text-sm font-semibold">{t('Schedule')}</legend>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={schedule !== null} onChange={event => setSchedule(event.target.checked ? emptySchedule() : null)} />
        {t('Open the code only at certain times')}</label>
      {schedule && <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2"><label htmlFor={`${id}-zone`} className="text-xs font-medium">{t('Time zone')}</label>
          <select id={`${id}-zone`} className={field} value={schedule.timezone} onChange={event => setPart({ timezone: event.target.value })}>
            {zones.map(zone => <option key={zone} value={zone}>{zone}</option>)}</select></div>
        <div className="space-y-1"><label htmlFor={`${id}-start`} className="text-xs font-medium">{t('Starts')}</label>
          <input id={`${id}-start`} type="datetime-local" className={field} value={schedule.startsAt ?? ''} onChange={event => setPart({ startsAt: event.target.value || null })} /></div>
        <div className="space-y-1"><label htmlFor={`${id}-end`} className="text-xs font-medium">{t('Ends')}</label>
          <input id={`${id}-end`} type="datetime-local" className={field} value={schedule.endsAt ?? ''} onChange={event => setPart({ endsAt: event.target.value || null })} /></div>
        <fieldset className="sm:col-span-2"><legend className="text-xs font-medium">{t('Days (none means every day)')}</legend>
          <div className="mt-1 flex flex-wrap gap-2">{dayNames.map((day, index) => <label key={day} className="flex items-center gap-1 text-sm">
            <input type="checkbox" className="size-4" checked={schedule.days.includes(index)}
              onChange={event => setPart({ days: event.target.checked ? [...schedule.days, index].sort() : schedule.days.filter(value => value !== index) })} />{t(day)}</label>)}</div></fieldset>
        <div className="space-y-1"><label htmlFor={`${id}-from`} className="text-xs font-medium">{t('Daily from')}</label>
          <input id={`${id}-from`} type="time" className={field} value={schedule.from ?? ''} onChange={event => setPart({ from: event.target.value || null })} /></div>
        <div className="space-y-1"><label htmlFor={`${id}-to`} className="text-xs font-medium">{t('Daily until')}</label>
          <input id={`${id}-to`} type="time" className={field} value={schedule.to ?? ''} onChange={event => setPart({ to: event.target.value || null })} /></div>
      </div>}
      <div className="space-y-1"><label htmlFor={`${id}-fallback`} className="text-xs font-medium">{t('Fallback address outside the schedule (optional)')}</label>
        <input id={`${id}-fallback`} type="url" className={field} value={fallback} placeholder="https://" dir="ltr" onChange={event => setFallback(event.target.value)} /></div>
      <Button type="button" variant="outline" onClick={() => void saveRules({ schedule, fallbackUrl: fallback.trim() || null }, 'Schedule saved.')}>{t('Save schedule')}</Button>
    </fieldset>

    <fieldset className="space-y-2"><legend className="text-sm font-semibold">{t('Location')}</legend>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={rules.askLocation}
        onChange={event => void saveRules({ askLocation: event.target.checked }, event.target.checked ? 'Visitors will be asked for their location.' : 'Visitors will not be asked for their location.')} />
        {t('Ask visitors to share an approximate location (they can decline)')}</label>
    </fieldset>

    <fieldset className="space-y-2"><legend className="text-sm font-semibold">{t('Aliases')}</legend>
      <p className="text-xs text-muted-foreground">{t('Readable short codes for this QR. Every alias keeps working; aliases cannot be removed or reused.')}</p>
      {aliases.length > 0 && <ul className="flex flex-wrap gap-2 text-sm">{aliases.map(item => <li key={item.alias}><code className="rounded bg-muted px-2 py-1" dir="ltr">/r/{item.alias}</code></li>)}</ul>}
      <form className="flex flex-wrap gap-2" onSubmit={async event => { event.preventDefault();
        const result = await assetRequest(`/api/qr-codes/${record.id}/aliases`, 'POST', { alias });
        if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
        setAliases(previous => [...previous, result.value.alias]); setAlias(''); setMessage({ tone: 'success', text: t('Alias added.') }); }}>
        <label htmlFor={`${id}-alias`} className="sr-only">{t('New alias')}</label>
        <input id={`${id}-alias`} className={`${field} max-w-xs`} value={alias} maxLength={32} placeholder="menu-lisboa" dir="ltr" onChange={event => setAlias(event.target.value.toLowerCase())} />
        <Button type="submit" variant="outline" disabled={alias.length < 3}>{t('Add alias')}</Button>
      </form>
    </fieldset>

    <fieldset className="space-y-2"><legend className="text-sm font-semibold">{t('Domain')}</legend>
      <label htmlFor={`${id}-domain`} className="sr-only">{t('Domain')}</label>
      <select id={`${id}-domain`} className={`${field} max-w-sm`} value={domains.find(item => item.hostname === record.tracking_host)?.id ?? ''}
        onChange={async event => {
          const result = await assetRequest(`/api/qr-codes/${record.id}/domain`, 'PATCH', { domain_id: event.target.value || null });
          if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
          onChanged({ tracking_host: result.value.tracking_host });
          setMessage({ tone: 'success', text: t('Domain updated. Download the code again before printing.') });
        }}>
        <option value="">{t('App address')}</option>
        {domains.filter(item => item.verified_at).map(item => <option key={item.id} value={item.id}>{item.hostname}</option>)}
      </select>
      <p className="text-xs text-muted-foreground">{t('Codes already printed keep working on the app address and on earlier domains of this workspace.')} <Link href="/settings/domains" className="text-primary hover:underline">{t('Manage domains')}</Link></p>
    </fieldset>
  </section>;
}
