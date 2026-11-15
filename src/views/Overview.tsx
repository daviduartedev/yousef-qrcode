'use client';

import Link from 'next/link';
import { ArrowRight, ChevronRight, Plus, QrCode, ScanLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { QRScanPerformance } from '@/components/QRScanPerformance';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import type { getQROverview } from '@/server/analytics';

const darkCard = 'min-w-0 rounded-md bg-slate-900 text-slate-50 shadow-sm';
const metricLabel = 'text-xs font-medium text-slate-300';
const metricValue = 'text-2xl font-semibold tabular-nums';
const cardHeader = 'flex min-h-14 items-center justify-between gap-2 border-b border-white/20 px-4 py-3 sm:px-5 2xl:min-h-16';
const trackingList = '/my-qrcodes?mode=tracked';
const editHref = (id: string) => '/app?edit=' + encodeURIComponent(id);

export default function Overview({ data }: { data: Awaited<ReturnType<typeof getQROverview>> }) {
  const { t: copy, i18n } = useTranslation('copy');
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);
  const { t: lifecycleCopy } = useTranslation('analytics');
  const { counts, scanHistory, recent, top, lifecycle } = data;
  const statuses = [
    { label: 'New', hint: 'Created in the last 7 days', value: lifecycle.new, color: 'bg-violet-500', href: '/my-qrcodes?lifecycle=new' },
    { label: 'Active', hint: 'Scanned in the last 30 days', value: lifecycle.active, color: 'bg-emerald-500', href: '/my-qrcodes?lifecycle=active' },
    { label: 'Declining', hint: 'Last 14 days below half of the 14 days before', value: lifecycle.declining, color: 'bg-orange-500', href: '/my-qrcodes?lifecycle=declining' },
    { label: 'No scans', hint: 'No scans in the last 30 days', value: lifecycle.no_scans, color: 'bg-slate-400', href: '/my-qrcodes?lifecycle=no_scans' },
    { label: 'Paused', hint: 'Tracking paused', value: lifecycle.paused, color: 'bg-amber-500', href: '/my-qrcodes?lifecycle=paused' },
    { label: 'Direct QR Codes', hint: 'Direct and static codes have no scan data', value: counts.total - counts.active - counts.inactive, color: 'bg-sky-500', href: '/my-qrcodes?mode=direct' },
  ];

  return <WorkspaceShell>
    <main className="space-y-6 px-4 py-5 sm:px-6 sm:py-6 2xl:space-y-8 2xl:px-8">
      <h1 className="sr-only">{copy('Overview')}</h1>
      <ul aria-label={lifecycleCopy('QR Code lifecycle')} className="flex min-h-16 flex-wrap items-center gap-x-5 gap-y-1 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground sm:px-4">
        {statuses.map(({ label, hint, value, color, href }) => <li key={label}>
          <Link href={href} title={lifecycleCopy(hint)} className="inline-flex min-h-9 items-center gap-2 rounded-sm hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            <span className={`size-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />
            {lifecycleCopy(label)} ({number.format(value)})
          </Link>
        </li>)}
      </ul>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:auto-rows-[11.75rem] 2xl:gap-6">
        <section className={darkCard} aria-labelledby="qr-counts-title">
          <div className={cardHeader}>
            <h2 id="qr-counts-title" className="text-lg font-semibold">{copy('QR Codes')}</h2>
            <Link href="/my-qrcodes" className="grid size-9 shrink-0 place-items-center rounded hover:bg-white/10" aria-label={copy('My QR Codes')}>
              <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-3 px-4 py-5 sm:px-5">
            <div className="flex flex-col-reverse"><dt className={metricLabel}>{copy('Total QR Codes')}</dt><dd className={metricValue}>{number.format(counts.total)}</dd></div>
            <div className="flex flex-col-reverse"><dt className={metricLabel}>{copy('Total Scans')}</dt><dd className={metricValue}>{number.format(counts.scans)}</dd></div>
          </dl>
        </section>

        <section className={darkCard} aria-labelledby="qr-tracking-title">
          <div className={cardHeader}>
            <h2 id="qr-tracking-title" className="text-lg font-semibold">{copy('Tracking status')}</h2>
            <Link href={trackingList} className="grid size-9 shrink-0 place-items-center rounded hover:bg-white/10" aria-label={copy('Manage tracking')}>
              <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-3 px-4 py-5 sm:px-5">
            <div className="flex flex-col-reverse"><dt className={metricLabel}>{copy('Active tracked codes')}</dt><dd className={metricValue}>{number.format(counts.active)}</dd></div>
            <div className="flex flex-col-reverse"><dt className={metricLabel}>{copy('Inactive tracked codes')}</dt><dd className={metricValue}>{number.format(counts.inactive)}</dd></div>
          </dl>
        </section>

        <section className="relative isolate min-w-0 overflow-hidden rounded-md bg-gradient-to-br from-emerald-950 to-emerald-700 px-4 py-4 text-white shadow-sm sm:px-5">
          <QrCode className="pointer-events-none absolute -bottom-4 -end-3 -z-10 size-28 text-white/20" strokeWidth={1.1} aria-hidden="true" />
          <h2 className="text-lg font-semibold">{copy(counts.total === 0 ? 'Create your first QR Code' : 'Create a QR Code')}</h2>
          <p className="mb-4 mt-1 max-w-[22ch] text-sm text-emerald-50/90">{copy('Choose a destination and customize the design.')}</p>
          <Button asChild className="min-h-11 gap-2 bg-white text-emerald-950 hover:bg-emerald-50">
            <Link href="/app"><Plus size={16} aria-hidden="true" />{copy('Create QR Code')}</Link>
          </Button>
        </section>

        <section className={darkCard + ' px-4 py-4 sm:px-5'} aria-labelledby="qr-top-title">
          <h2 id="qr-top-title" className="text-lg font-semibold">{copy('Top performing QR Code')}</h2>
          {top
            ? <Link href={editHref(top.id)} className="mt-3 flex min-h-11 items-center gap-3 rounded-sm text-slate-200 hover:text-white hover:underline">
                <ScanLine className="size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{top.title || top.destination}</span>
                  <span className="text-xs text-slate-300">{copy('{{count}} scans', { count: top.scans })}</span>
                </span>
              </Link>
            : <p className="mt-2 text-sm leading-relaxed text-slate-300">{copy('Scans from your tracked QR Codes will appear here.')}</p>}
        </section>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] 2xl:gap-6">
        <QRScanPerformance history={scanHistory} />
        <aside aria-label={copy('QR Code activity')} className="grid min-w-0 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gradient-to-r from-blue-700 to-slate-900 px-4 py-4 text-white shadow-sm sm:px-5">
            <h2 className="text-base font-semibold">{copy('Manage your tracked QR Codes')}</h2>
            <Button asChild className="min-h-11 gap-2 bg-white text-slate-900 hover:bg-blue-50">
              <Link href={trackingList}>{copy('Manage tracking')}<ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" /></Link>
            </Button>
          </div>
          <section aria-labelledby="qr-recent-title" className="rounded-md border bg-card shadow-sm">
            <h2 id="qr-recent-title" className="border-b px-4 py-3 text-lg font-semibold tracking-tight sm:px-5">{copy('Recent QR Codes')}</h2>
            {recent.length === 0
              ? <p className="p-4 text-sm text-muted-foreground sm:px-5">{copy('Your saved codes will appear here.')}</p>
              : <ul className="divide-y">
                  {recent.map(qr => <li key={qr.id}>
                    <Link href={editHref(qr.id)} className="flex min-w-0 items-center gap-3 px-4 py-3 hover:bg-muted/60 sm:px-5">
                      <QrCode className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{qr.title || qr.destination}</span>
                        <span className="text-xs text-muted-foreground">{copy(qr.tracked ? (qr.active ? 'Active' : 'Inactive') : 'Direct')}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
                    </Link>
                  </li>)}
                </ul>}
          </section>
        </aside>
      </div>
    </main>
  </WorkspaceShell>;
}
