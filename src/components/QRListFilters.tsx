'use client';

import { Filter, LayoutGrid, LayoutList, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  clearQRFilters, encodeQRFilterRules, hasQRFilters, qrFilterFields, qrFilterLimit, qrFilterOperators,
  normalizeQRDigits, qrListHref, qrSorts, readQRListQuery, type QRFilterField, type QRFilterRule, type QRListQuery,
} from '@/lib/qr-list';

export type QRCollection = { id: string; name: string };
export type QROrganization = { folders: QRCollection[]; labels: QRCollection[] };
export const qrControl = 'min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const sortLabel = { newest: 'Newest created', oldest: 'Oldest created', updated: 'Last updated', name: 'Name (A–Z)', scans: 'Most scans' };
const fieldLabel = { name: 'Name', destination: 'Destination', mode: 'QR mode', status: 'Tracking status', scans: 'Scans', created: 'Date created (UTC)', updated: 'Date updated (UTC)' };
const operatorLabel = { contains: 'Contains', not_contains: 'Does not contain', is: 'Is', is_not: 'Is not', gte: 'At least', lte: 'At most', before: 'Before', after: 'After' };
const valueOptions = { mode: [['direct', 'Direct'], ['tracked', 'Tracked']], status: [['active', 'Active'], ['inactive', 'Inactive']] };

function createRule(field: QRFilterField): QRFilterRule {
  return { field, op: qrFilterOperators[field][0], value: field === 'mode' || field === 'status' ? valueOptions[field][0][0] : '' };
}

export function QRListFilters({ query, folders, labels }: QROrganization & { query: QRListQuery }) {
  const { t: copy } = useTranslation('copy');
  const router = useRouter();
  const panel = useId();
  const [open, setOpen] = useState(Boolean(query.rules.length || query.mode || query.status));
  const conditionCount = query.rules.length + Number(Boolean(query.mode)) + Number(Boolean(query.status));
  const [rules, setRules] = useState(query.rules);
  const [mode, setMode] = useState(query.mode);
  const [status, setStatus] = useState(query.status);

  function modify(index: number, rule: QRFilterRule) {
    setRules(current => current.map((item, at) => at === index ? rule : item));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = readQRListQuery(new URLSearchParams({
      q: String(form.get('q') ?? ''), mode, status, view: query.view, sort: query.sort,
      rules: encodeQRFilterRules(rules.filter(rule => rule.value.trim())),
      folder: String(form.get('folder') ?? ''), label: String(form.get('label') ?? ''), watch: String(form.get('watch') ?? ''),
    }));
    router.push(qrListHref(next));
  }

  return <form onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-4">
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-40 flex-1">
        <span className="sr-only">{copy('Search by name or destination')}</span>
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input className={qrControl + ' ps-9'} type="search" name="q" placeholder={copy('Search by name or destination')} defaultValue={query.q} maxLength={2048} />
      </label>
      <Button variant="outline" type="button" className="min-h-11 gap-2" aria-controls={panel} aria-expanded={open} onClick={() => setOpen(!open)}>
        <Filter size={16} aria-hidden="true" />{copy('Filters')}{conditionCount > 0 && <span className="rounded bg-muted px-1.5">{conditionCount}</span>}
      </Button>
      <label className="min-w-40">
        <span className="sr-only">{copy('Sort QR Codes')}</span>
        <select name="sort" value={query.sort} className={qrControl} onChange={event => router.push(qrListHref({
          ...query, page: 1, sort: event.target.value as QRListQuery['sort'],
        }))}>
          {qrSorts.map(sort => <option key={sort} value={sort}>{copy(sortLabel[sort])}</option>)}
        </select>
      </label>
      <div className="flex rounded-md border p-0.5" role="group" aria-label={copy('QR Code view')}>
        {([{ view: 'list', icon: LayoutList, label: 'List view' }, { view: 'grid', icon: LayoutGrid, label: 'Grid view' }] as const).map(({ view, icon: Icon, label }) =>
          <Link key={view} href={qrListHref({ ...query, view })} aria-label={copy(label)} title={copy(label)}
            aria-current={query.view === view ? 'true' : undefined}
            className={'grid size-10 place-items-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ' +
              (query.view === view ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100' : 'text-muted-foreground hover:bg-muted')}>
            <Icon size={17} aria-hidden="true" />
          </Link>)}
      </div>
    </div>
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="min-w-0 text-xs font-medium">{copy('Folder')}
        <select name="folder" className={qrControl + ' mt-1'} defaultValue={query.folder}>
          <option value="">{copy('All folders')}</option>
          <option value="none">{copy('No folder')}</option>
          {query.folder && query.folder !== 'none' && !folders.some(item => item.id === query.folder) &&
            <option value={query.folder}>{copy('Unavailable folder')}</option>}
          {folders.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="min-w-0 text-xs font-medium">{copy('Label')}
        <select name="label" className={qrControl + ' mt-1'} defaultValue={query.label}>
          <option value="">{copy('All labels')}</option>
          {query.label && !labels.some(item => item.id === query.label) && <option value={query.label}>{copy('Unavailable label')}</option>}
          {labels.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="min-w-0 text-xs font-medium">{copy('Watchlist')}
        <select name="watch" className={qrControl + ' mt-1'} defaultValue={query.watch}>
          <option value="">{copy('All QR Codes')}</option>
          <option value="yes">{copy('On watchlist')}</option>
          <option value="no">{copy('Tracked and not on watchlist')}</option>
        </select>
      </label>
    </div>
    <div id={panel} hidden={!open} className="rounded-md border bg-muted/30 p-3">
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-medium">{copy('QR mode')}
          <select className={qrControl + ' mt-1'} value={mode} onChange={event => {
            const next = event.target.value as QRListQuery['mode'];
            setMode(next);
            if (next === 'direct') setStatus('');
          }}>
            <option value="">{copy('All modes')}</option>
            <option value="direct">{copy('Direct')}</option>
            <option value="tracked">{copy('Tracked')}</option>
          </select>
        </label>
        <label className="text-xs font-medium">{copy('Tracking status')}
          <select className={qrControl + ' mt-1 disabled:opacity-50'} value={status} disabled={mode === 'direct'}
            onChange={event => setStatus(event.target.value as QRListQuery['status'])}>
            <option value="">{copy('All statuses')}</option>
            <option value="active">{copy('Active')}</option>
            <option value="inactive">{copy('Inactive')}</option>
          </select>
        </label>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">{copy('Match all conditions')}</legend>
        {rules.map((rule, index) => <div key={index} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="min-w-0 text-xs font-medium">{copy('Field')}
            <select value={rule.field} className={qrControl + ' mt-1'} onChange={event => modify(index, createRule(event.target.value as QRFilterField))}>
              {qrFilterFields.map(field => <option key={field} value={field}>{copy(fieldLabel[field])}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium">{copy('Operator')}
            <select value={rule.op} className={qrControl + ' mt-1'} onChange={event => modify(index, { ...rule, op: event.target.value as QRFilterRule['op'] })}>
              {qrFilterOperators[rule.field].map(op => <option key={op} value={op}>{copy(operatorLabel[op])}</option>)}
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium">{copy('Value')}
            {rule.field === 'mode' || rule.field === 'status'
              ? <select className={qrControl + ' mt-1'} value={rule.value} onChange={event => modify(index, { ...rule, value: event.target.value })}>
                {valueOptions[rule.field].map(([value, label]) => <option key={value} value={value}>{copy(label)}</option>)}
              </select>
              : <input type={rule.field === 'created' || rule.field === 'updated' ? 'date' : 'text'}
                min={rule.field === 'created' || rule.field === 'updated' ? '0001-01-01' : undefined}
                max={rule.field === 'created' || rule.field === 'updated' ? '9999-12-31' : undefined}
                inputMode={rule.field === 'scans' ? 'numeric' : undefined}
                pattern={rule.field === 'scans' ? '[0-9]{1,10}' : undefined}
                maxLength={rule.field === 'scans' ? 10 : 256} value={rule.value}
                className={qrControl + ' mt-1'} onChange={event => {
                  const value = rule.field === 'scans' ? normalizeQRDigits(event.target.value) : event.target.value;
                  const nonnegative = rule.field !== 'scans' || !value || (/^\d{1,10}$/.test(value) && Number(value) <= 2147483647);
                  if (nonnegative) modify(index, { ...rule, value });
                }} />}
          </label>
          <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={copy('Remove condition {{number}}', { number: index + 1 })}
            onClick={() => setRules(current => current.filter((_, at) => at !== index))}><X size={16} aria-hidden="true" /></Button>
        </div>)}
        <Button type="button" variant="outline" className="min-h-11 gap-2" disabled={rules.length >= qrFilterLimit}
          onClick={() => setRules(current => [...current, createRule('name')])}><Plus size={16} aria-hidden="true" />{copy('Add condition')}</Button>
      </fieldset>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button type="submit" className="min-h-11 bg-blue-700 text-white hover:bg-blue-800">{copy('Apply filters')}</Button>
      {hasQRFilters(query) && <Button asChild variant="outline" className="min-h-11">
        <Link href={qrListHref(clearQRFilters(query))}>{copy('Clear filters')}</Link>
      </Button>}
    </div>
  </form>;
}
