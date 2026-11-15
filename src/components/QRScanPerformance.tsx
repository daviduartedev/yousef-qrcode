'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function QRScanPerformance({ history }: { history: { day: string; scans: number }[] }) {
  const { t: copy, i18n } = useTranslation('copy');
  const [period, setPeriod] = useState(7);
  const dates = new Intl.DateTimeFormat(i18n.resolvedLanguage, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);
  const current = history.slice(-period);
  const previous = history.slice(-period * 2, -period);
  const points = current.map(({ day, scans }, index) => ({ day, scans, previous: previous[index].scans }));
  const series = [
    { label: 'Scans', color: 'bg-blue-700', values: current },
    { label: 'Previous scans', color: 'bg-sky-500', values: previous },
  ];
  const parseDay = (day: string) => new Date(day + 'T00:00:00Z');
  const comparisonDates = new Map(current.map(({ day }, index) => [day, previous[index].day]));

  return <section aria-labelledby="qr-performance-title" className="min-w-0 rounded-md border bg-card shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
      <h2 id="qr-performance-title" className="text-lg font-semibold tracking-tight sm:text-xl">{copy('QR Codes performance')}</h2>
      <select aria-label={copy('Scan period')} value={period} onChange={event => setPeriod(Number(event.target.value))}
        className="min-h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring">
        {[7, 14, 30].map(days => <option key={days} value={days}>{copy('Last {{days}} days', { days })}</option>)}
      </select>
    </div>
    <div className="grid gap-4 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_9.5rem] sm:px-5">
      <div className="h-52 min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={points} margin={{ top: 10, bottom: 2, left: 0, right: 12 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="day" minTickGap={32} tickMargin={8} tickLine={false} axisLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={day => dates.format(parseDay(day))} />
            <YAxis allowDecimals={false} domain={[0, (dataMax: number) => Math.max(1, dataMax)]} width={28}
              tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip labelFormatter={day => {
              const date = String(day);
              const earlier = comparisonDates.get(date);
              return earlier ? copy('{{current}} compared with {{previous}}', {
                current: dates.format(parseDay(date)), previous: dates.format(parseDay(earlier)),
              }) : dates.format(parseDay(date));
            }}
              contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', borderColor: 'hsl(var(--border))' }} />
            <Line dataKey="previous" name={copy('Previous scans')} stroke="#0ea5e9" strokeWidth={2} dot={false} strokeDasharray="4 4" isAnimationActive={false} />
            <Line dataKey="scans" name={copy('Scans')} stroke="#1d4ed8" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <dl aria-live="polite" className="grid grid-cols-2 content-center gap-4 sm:grid-cols-1">
        {series.map(({ label, values, color }) => <div key={label}>
          <dt className="flex items-center gap-2 text-sm"><span className={`size-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />{copy(label)}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums">{number.format(values.reduce((sum, value) => sum + value.scans, 0))}</dd>
          <dd className="mt-1 text-xs text-muted-foreground">{/* Built by hand: server and browser ICU disagree on formatRange spacing, which broke hydration. */}
            {`${dates.format(parseDay(values[0].day))} – ${dates.format(parseDay(values[values.length - 1].day))}`}</dd>
        </div>)}
      </dl>
    </div>
  </section>;
}
