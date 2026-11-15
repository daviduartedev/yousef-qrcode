'use client';

import Link from 'next/link';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { addDays, analyticsDevices, analyticsSearch } from '@/lib/qr-analytics';
import type { CardAnalytics as Data } from '@/server/card-analytics';

const field = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';

export default function CardAnalytics({ data, today }: { data: Data; today: string }) {
  const { t, i18n } = useTranslation('cards');
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);
  const dates = new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const { query, summary, previous } = data;
  const base = `/cards/${data.card.id}/analytics`;
  const preset = (days: number) => `${base}?${analyticsSearch({ ...query, from: addDays(today, -(days - 1)), to: today })}`;
  const cards = [['Views', 'views'], ['Unique visitors', 'unique_visitors'], ['Contact saves', 'saves'], ['Contact actions', 'actions'], ['Contacts received', 'contacts']] as const;

  return <WorkspaceShell>
    <main className="space-y-5 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/cards/${data.card.id}`} className="text-sm text-primary hover:underline">{t('Back to editor')}</Link>
          <h1 className="text-2xl font-semibold tracking-tight" dir="auto">{t('Analytics · {{title}}', { title: data.card.title })}</h1>
          <p className="text-sm text-muted-foreground">{t('Views count when the published card opens in a browser. Saves are vCard downloads; actions are calls, emails, website, map and social taps. Bots and repeats within 10 seconds are not counted. Days are in UTC.')}</p>
        </div>
        <Button asChild variant="outline"><a href={`/api/cards/${data.card.id}/analytics/export?${analyticsSearch(query)}`}><Download className="me-2 size-4" aria-hidden="true" />{t('Export CSV')}</a></Button>
      </div>
      <form action={base} className="grid gap-3 rounded-md border bg-card p-4 sm:grid-cols-4">
        <div className="space-y-1"><label htmlFor="ca-from" className="text-sm font-medium">{t('From')}</label><input id="ca-from" type="date" name="from" defaultValue={query.from} max={today} className={field} /></div>
        <div className="space-y-1"><label htmlFor="ca-to" className="text-sm font-medium">{t('To')}</label><input id="ca-to" type="date" name="to" defaultValue={query.to} max={today} className={field} /></div>
        <div className="space-y-1"><label htmlFor="ca-device" className="text-sm font-medium">{t('Device')}</label>
          <select id="ca-device" name="device" defaultValue={query.device} className={field}><option value="">{t('All devices')}</option>
            {analyticsDevices.map(device => <option key={device} value={device}>{t(device)}</option>)}</select></div>
        <div className="flex items-end"><Button type="submit" className="min-h-11 w-full">{t('Apply')}</Button></div>
        <nav aria-label={t('Quick periods')} className="flex flex-wrap gap-2 text-sm sm:col-span-4">
          {[7, 30, 90].map(days => <Link key={days} href={preset(days)} className="rounded-full border px-3 py-1 hover:bg-muted">{t('Last {{days}} days', { days })}</Link>)}</nav>
      </form>
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, key]) => <div key={key} className="rounded-md border bg-card p-4 shadow-sm">
          <dt className="text-sm text-muted-foreground">{t(label)}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{number.format(summary[key])}</dd>
          <dd className="text-xs text-muted-foreground">{t('Previous period: {{value}}', { value: number.format(previous[key]) })}</dd>
        </div>)}
      </dl>
      <section aria-labelledby="ca-daily" className="rounded-md border bg-card p-4 shadow-sm">
        <h2 id="ca-daily" className="mb-3 font-semibold">{t('Activity per day')}</h2>
        <div className="h-64"><ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={data.daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tickFormatter={day => dates.format(new Date(day + 'T00:00:00Z'))} minTickGap={24} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11 }} /><Tooltip labelFormatter={day => dates.format(new Date(String(day) + 'T00:00:00Z'))} /><Legend />
            <Line type="monotone" dataKey="views" name={t('Views')} stroke="#1d4ed8" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="saves" name={t('Contact saves')} stroke="#059669" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="actions" name={t('Contact actions')} stroke="#0ea5e9" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart></ResponsiveContainer></div>
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-label={t('Actions')} className="rounded-md border bg-card p-4 shadow-sm"><h2 className="mb-3 font-semibold">{t('Actions')}</h2>
          {data.actions.length === 0 ? <p className="text-sm text-muted-foreground">{t('No actions in this period.')}</p>
            : <ol className="space-y-2 text-sm">{data.actions.map(action => <li key={action.target} className="flex justify-between gap-2">
              <span className="truncate" dir="auto">{action.kind === 'removed' ? t('Removed action') : `${t(action.kind)} · ${action.label}`}</span><span className="tabular-nums">{number.format(action.total)}</span></li>)}</ol>}</section>
        {([['Devices', data.devices], ['Countries', data.countries]] as const).map(([title, values]) => <section key={title} aria-label={t(title)} className="rounded-md border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">{t(title)}</h2>
          {Object.keys(values).length === 0 ? <p className="text-sm text-muted-foreground">{t('No views in this period.')}</p>
            : <ul className="space-y-2 text-sm">{Object.entries(values).map(([key, value]) => <li key={key} className="flex justify-between gap-2">
              <span dir="auto">{['mobile', 'tablet', 'desktop', 'Unknown'].includes(key) ? t(key) : key}</span><span className="tabular-nums">{number.format(value)}</span></li>)}</ul>}
        </section>)}
      </div>
    </main>
  </WorkspaceShell>;
}
