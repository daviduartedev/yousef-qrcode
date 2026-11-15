'use client';

import { Filter, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { qrListHref, readQRListQuery, type QRListQuery } from '@/lib/qr-list';

const control = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function QRListFilters({ query }: { query: QRListQuery }) {
  const { t: copy } = useTranslation('copy');
  const router = useRouter();
  const [mode, setMode] = useState(query.mode);
  const [status, setStatus] = useState(query.status);
  const filtered = Boolean(query.q || query.mode || query.status);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    router.push(qrListHref(readQRListQuery({ get: name => String(form.get(name) ?? '') })));
  }

  return <form onSubmit={submit} className="grid items-end gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1.5fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_auto]">
    <label className="grid min-w-0 gap-1 text-sm font-medium">
      {copy('Search by name or destination')}
      <span className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input className={control + ' ps-9'} type="search" name="q" defaultValue={query.q} maxLength={2048} />
      </span>
    </label>
    <label className="grid min-w-0 gap-1 text-sm font-medium">
      {copy('QR mode')}
      <select className={control} name="mode" value={mode} onChange={event => {
        const next = event.target.value as QRListQuery['mode'];
        setMode(next);
        if (next === 'direct') setStatus('');
      }}>
        <option value="">{copy('All modes')}</option>
        <option value="direct">{copy('Direct')}</option>
        <option value="tracked">{copy('Tracked')}</option>
      </select>
    </label>
    <label className="grid min-w-0 gap-1 text-sm font-medium">
      {copy('Tracking status')}
      <select className={control + ' disabled:opacity-50'} name="status" value={status} disabled={mode === 'direct'}
        onChange={event => setStatus(event.target.value as QRListQuery['status'])}>
        <option value="">{copy('All statuses')}</option>
        <option value="active">{copy('Active')}</option>
        <option value="inactive">{copy('Inactive')}</option>
      </select>
    </label>
    <div className="flex flex-wrap gap-2">
      <Button type="submit" className="min-h-11 gap-2 bg-blue-700 text-white hover:bg-blue-800"><Filter size={16} aria-hidden="true" />{copy('Apply filters')}</Button>
      {filtered && <Button asChild variant="outline" className="min-h-11"><Link href="/my-qrcodes">{copy('Clear filters')}</Link></Button>}
    </div>
  </form>;
}
