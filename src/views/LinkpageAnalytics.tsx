'use client';

import Link from 'next/link';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { addDays, analyticsDevices, analyticsSearch } from '@/lib/qr-analytics';
import type { LinkpageAnalytics as Data } from '@/server/linkpage-analytics';

const field = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';

export default function LinkpageAnalytics({ data, today }: { data: Data; today: string }) {
  const { t, i18n } = useTranslation('linkpages');
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);
  const percent = new Intl.NumberFormat(i18n.resolvedLanguage, { style: 'percent', maximumFractionDigits: 1 });
  const dates = new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const { query, summary, previous } = data;
  const base = `/linkpages/${data.page.id}/analytics`;
  const preset = (days: number) => `${base}?${analyticsSearch({ ...query, from: addDays(today, -(days - 1)), to: today })}`;
  const rate = (value: { views: number; clicks: number }) => value.views ? value.clicks / value.views : 0;
  const cards = [
    ['Views', summary.views, previous.views],
    ['Unique visitors', summary.unique_visitors, previous.unique_visitors],
    ['Clicks', summary.clicks, previous.clicks],
  ] as const;

  return <WorkspaceShell>
    <main className="space-y-5 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/linkpages/${data.page.id}`} className="text-sm text-primary hover:underline">{t('Back to editor')}</Link>
          <h1 className="text-2xl font-semibold tracking-tight" dir="auto">{t('Analytics · {{title}}', { title: data.page.title })}</h1>
          <p className="text-sm text-muted-foreground">{t('Views count when the published page opens in a browser. Bots, link previews and repeats within 10 seconds are not counted. Days are in UTC.')}</p>
        </div>
        <Button asChild variant="outline"><a href={`/api/linkpages/${data.page.id}/analytics/export?${analyticsSearch(query)}`}><Download className="me-2 size-4" aria-hidden="true" />{t('Export CSV')}</a></Button>
      </div>

      <form action={base} className="grid gap-3 rounded-md border bg-card p-4 sm:grid-cols-4">
        <div className="space-y-1"><label htmlFor="lp-from" className="text-sm font-medium">{t('From')}</label><input id="lp-from" type="date" name="from" defaultValue={query.from} max={today} className={field} /></div>
        <div className="space-y-1"><label htmlFor="lp-to" className="text-sm font-medium">{t('To')}</label><input id="lp-to" type="date" name="to" defaultValue={query.to} max={today} className={field} /></div>
        <div className="space-y-1"><label htmlFor="lp-device" className="text-sm font-medium">{t('Device')}</label>
          <select id="lp-device" name="device" defaultValue={query.device} className={field}>
            <option value="">{t('All devices')}</option>
            {analyticsDevices.map(device => <option key={device} value={device}>{t(device)}</option>)}
          </select>
        </div>
        <div className="flex items-end"><Button type="submit" className="min-h-11 w-full">{t('Apply')}</Button></div>
        <nav aria-label={t('Quick periods')} className="flex flex-wrap gap-2 text-sm sm:col-span-4">
          {[7, 30, 90].map(days => <Link key={days} href={preset(days)} className="rounded-full border px-3 py-1 hover:bg-muted">{t('Last {{days}} days', { days })}</Link>)}
        </nav>
      </form>

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, before]) => <div key={label} className="rounded-md border bg-card p-4 shadow-sm">
          <dt className="text-sm text-muted-foreground">{t(label)}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{number.format(value)}</dd>
          <dd className="text-xs text-muted-foreground">{t('Previous period: {{value}}', { value: number.format(before) })}</dd>
        </div>)}
        <div className="rounded-md border bg-card p-4 shadow-sm">
          <dt className="text-sm text-muted-foreground">{t('Click rate')}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{percent.format(rate(summary))}</dd>
          <dd className="text-xs text-muted-foreground">{t('Previous period: {{value}}', { value: percent.format(rate(previous)) })}</dd>
        </div>
      </dl>
      {summary.views_without_address > 0 && <p className="text-xs text-muted-foreground">{t('{{count}} views had no trusted network address and are not part of unique visitors.', { count: summary.views_without_address })}</p>}

      <section aria-labelledby="lp-daily" className="rounded-md border bg-card p-4 shadow-sm">
        <h2 id="lp-daily" className="mb-3 font-semibold">{t('Views and clicks per day')}</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={data.daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} accessibilityLayer>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tickFormatter={day => dates.format(new Date(day + 'T00:00:00Z'))} minTickGap={24} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={day => dates.format(new Date(String(day) + 'T00:00:00Z'))} />
              <Legend />
              <Line type="monotone" dataKey="views" name={t('Views')} stroke="#1d4ed8" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="clicks" name={t('Clicks')} stroke="#0ea5e9" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-labelledby="lp-blocks" className="rounded-md border bg-card p-4 shadow-sm lg:col-span-1">
          <h2 id="lp-blocks" className="mb-3 font-semibold">{t('Clicks per block')}</h2>
          {data.blocks.length === 0 ? <p className="text-sm text-muted-foreground">{t('No clicks in this period.')}</p>
            : <ol className="space-y-2 text-sm">{data.blocks.map(block => <li key={block.block_id} className="flex justify-between gap-2">
                <span className="truncate" dir="auto">{block.label === 'Removed block' ? t('Removed block') : block.label}</span><span className="tabular-nums">{number.format(block.clicks)}</span>
              </li>)}</ol>}
        </section>
        {([['Devices', data.devices], ['Countries', data.countries]] as const).map(([title, values]) => <section key={title} aria-label={t(title)} className="rounded-md border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">{t(title)}</h2>
          {Object.keys(values).length === 0 ? <p className="text-sm text-muted-foreground">{t('No views in this period.')}</p>
            : <ul className="space-y-2 text-sm">{Object.entries(values).map(([key, value]) => <li key={key} className="flex justify-between gap-2">
                <span dir="auto">{['mobile', 'tablet', 'desktop', 'Unknown'].includes(key) ? t(key) : key}</span><span className="tabular-nums">{number.format(value)}</span>
              </li>)}</ul>}
        </section>)}
      </div>
    </main>
  </WorkspaceShell>;
}
