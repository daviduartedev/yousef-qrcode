'use client';

import Link from 'next/link';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { addDays, analyticsDevices, analyticsSearch, type AnalyticsResponse } from '@/lib/qr-analytics';

const field = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';

/** Only known values are translated; OS, browser and country names from scans are shown as stored. */
const translatable = new Set(['mobile', 'tablet', 'desktop', 'Unknown']);

function Breakdown({ title, data, total, number }: { title: string; data: Record<string, number>; total: number; number: Intl.NumberFormat }) {
  const { t } = useTranslation('analytics');
  const entries = Object.entries(data);
  return <section aria-label={t(title)} className="min-w-0 rounded-md border bg-card p-4 shadow-sm">
    <h3 className="mb-3 font-semibold">{t(title)}</h3>
    {entries.length === 0 ? <p className="text-sm text-muted-foreground">{t('No scans in this period.')}</p>
      : <ul className="space-y-2">
          {entries.map(([key, count]) => <li key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
            <span dir="auto" className="truncate">{translatable.has(key) ? t(key) : key}</span>
            <span className="tabular-nums">{number.format(count)}</span>
            <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span className="block h-full rounded-full bg-blue-700" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
            </span>
          </li>)}
        </ul>}
  </section>;
}

export default function Analytics({ data, today }: { data: AnalyticsResponse; today: string }) {
  const { t, i18n } = useTranslation('analytics');
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);
  const percent = new Intl.NumberFormat(i18n.resolvedLanguage, { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' });
  const dates = new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const longDates = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeZone: 'UTC' });
  const { query, summary, previousSummary } = data;
  const day = (value: string) => new Date(value + 'T00:00:00Z');
  const preset = (days: number) => '/analytics?' + analyticsSearch({ ...query, from: addDays(today, -(days - 1)), to: today });
  const change = (now: number, before: number) => before === 0 ? (now === 0 ? t('No change') : t('New activity')) : percent.format((now - before) / before);
  const countries = [...new Set([...Object.keys(data.byCountry).filter(name => name !== 'Unknown'), ...(query.country ? [query.country] : [])])];
  const filtered = Boolean(query.qr || query.device || query.country);
  const cards = [
    { label: 'Scans', value: summary.scans, before: previousSummary.scans },
    { label: 'Unique scanners', value: summary.uniqueScanners, before: previousSummary.uniqueScanners },
  ];

  return <WorkspaceShell>
    <main className="space-y-6 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('QR Code analytics')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('{{from}} to {{to}} (UTC), compared with {{previousFrom}} to {{previousTo}}.', {
              from: longDates.format(day(query.from)), to: longDates.format(day(query.to)),
              previousFrom: longDates.format(day(data.previous.from)), previousTo: longDates.format(day(data.previous.to)),
            })}
          </p>
        </div>
        <Button asChild variant="outline" className="min-h-11 gap-2">
          <a href={'/api/analytics/export?' + analyticsSearch(query)} download>
            <Download className="size-4" aria-hidden="true" />{t('Export CSV')}
          </a>
        </Button>
      </div>

      <nav aria-label={t('Period')} className="flex flex-wrap gap-2">
        {[7, 30, 90].map(days => <Button key={days} asChild size="sm" variant={query.to === today && query.from === addDays(today, -(days - 1)) ? 'default' : 'outline'}>
          <Link href={preset(days)}>{t('Last {{days}} days', { days })}</Link>
        </Button>)}
      </nav>

      <form method="get" action="/analytics" className="grid gap-3 rounded-md border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end">
        <label className="space-y-1 text-sm font-medium">{t('From')}
          <input type="date" name="from" defaultValue={query.from} max={today} className={field} required />
        </label>
        <label className="space-y-1 text-sm font-medium">{t('To')}
          <input type="date" name="to" defaultValue={query.to} max={today} className={field} required />
        </label>
        <label className="space-y-1 text-sm font-medium">{t('QR Code')}
          <select name="qr" defaultValue={query.qr} className={field}>
            <option value="">{t('All tracked QR Codes')}</option>
            {data.codes.map(code => <option key={code.id} value={code.id}>{code.title || code.id}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">{t('Device')}
          <select name="device" defaultValue={query.device} className={field}>
            <option value="">{t('All devices')}</option>
            {analyticsDevices.map(device => <option key={device} value={device}>{t(device)}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">{t('Country')}
          <select name="country" defaultValue={query.country} className={field}>
            <option value="">{t('All countries')}</option>
            {countries.map(country => <option key={country} value={country}>{country}</option>)}
          </select>
        </label>
        <div className="flex gap-2">
          <Button type="submit" className="min-h-11">{t('Apply')}</Button>
          {filtered && <Button asChild variant="ghost" className="min-h-11">
            <Link href={'/analytics?' + analyticsSearch({ ...query, qr: '', device: '', country: '' })}>{t('Clear filters')}</Link>
          </Button>}
        </div>
      </form>

      <dl className="grid gap-4 sm:grid-cols-3">
        {cards.map(card => <div key={card.label} className="flex flex-col-reverse rounded-md bg-slate-900 p-4 text-slate-50 shadow-sm">
          <dt className="text-sm text-slate-300">
            {t(card.label)} · {t('previous period: {{count}}', { count: number.format(card.before) })} ({change(card.value, card.before)})
          </dt>
          <dd className="text-3xl font-semibold tabular-nums">{number.format(card.value)}</dd>
        </div>)}
        <div className="flex flex-col-reverse rounded-md border bg-card p-4 shadow-sm">
          <dt className="text-sm text-muted-foreground">{t('Scans without a trusted network address are counted as scans but not as unique scanners.')}</dt>
          <dd className="text-3xl font-semibold tabular-nums">{number.format(summary.scansWithoutAddress)}</dd>
        </div>
      </dl>

      <section aria-labelledby="analytics-series" className="rounded-md border bg-card p-4 shadow-sm">
        <h2 id="analytics-series" className="mb-3 text-lg font-semibold">{t('Scans per day')}</h2>
        {summary.scans === 0 && previousSummary.scans === 0
          ? <p className="py-10 text-center text-sm text-muted-foreground">{t('No scans in this period.')}</p>
          : <div className="h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={value => dates.format(day(value))} minTickGap={24} />
                  <YAxis allowDecimals={false} width={40} />
                  <Tooltip labelFormatter={value => longDates.format(day(String(value)))} formatter={(value, name) => [number.format(Number(value)), t(String(name))]} />
                  <Legend formatter={name => t(String(name))} />
                  <Line type="monotone" dataKey="scans" name="Scans" stroke="#1d4ed8" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="previous" name="Previous period" stroke="#0ea5e9" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>}
        <table className="sr-only">
          <caption>{t('Scans per day')}</caption>
          <thead><tr><th>{t('Date')}</th><th>{t('Scans')}</th><th>{t('Previous period')}</th></tr></thead>
          <tbody>{data.series.map(row => <tr key={row.day}><td>{row.day}</td><td>{row.scans}</td><td>{row.previous}</td></tr>)}</tbody>
        </table>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section aria-labelledby="analytics-top" className="min-w-0 rounded-md border bg-card p-4 shadow-sm">
          <h3 id="analytics-top" className="mb-3 font-semibold">{t('Top QR Codes')}</h3>
          {data.byQr.length === 0 ? <p className="text-sm text-muted-foreground">{t('No scans in this period.')}</p>
            : <ol className="space-y-2">
                {data.byQr.map(code => <li key={code.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link dir="auto" className="truncate hover:underline" href={'/analytics?' + analyticsSearch({ ...query, qr: code.id })}>{code.title || code.id}</Link>
                  <span className="tabular-nums">{number.format(code.scans)}</span>
                </li>)}
              </ol>}
        </section>
        <Breakdown title="Devices" data={data.byDevice} total={summary.scans} number={number} />
        <Breakdown title="Countries" data={data.byCountry} total={summary.scans} number={number} />
        <Breakdown title="Operating systems" data={data.byOs} total={summary.scans} number={number} />
        <Breakdown title="Browsers" data={data.byBrowser} total={summary.scans} number={number} />
        <section aria-labelledby="analytics-hours" className="min-w-0 rounded-md border bg-card p-4 shadow-sm">
          <h3 id="analytics-hours" className="mb-3 font-semibold">{t('Scans by hour (UTC)')}</h3>
          <ol className="flex h-28 items-end gap-0.5" dir="ltr">
            {data.byHour.map((count, hour) => <li key={hour} className="flex-1" title={`${hour}:00 · ${number.format(count)}`}>
              <span className="block rounded-t bg-blue-700" style={{ height: `${Math.max(...data.byHour) ? (count / Math.max(...data.byHour)) * 100 : 0}%`, minHeight: count ? 2 : 0 }} />
              <span className="sr-only">{`${hour}:00 UTC: ${count}`}</span>
            </li>)}
          </ol>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground" dir="ltr"><span>0h</span><span>12h</span><span>23h</span></div>
        </section>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('Scans count each redirect from a tracked QR Code. Bots, link previews and repeats from the same address and browser within 10 seconds are not counted.')}
      </p>
    </main>
  </WorkspaceShell>;
}
