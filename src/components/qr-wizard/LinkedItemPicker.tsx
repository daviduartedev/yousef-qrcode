'use client';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { LinkedQRKind } from '@/lib/qr-linked';

type Item = { id: string; title: string; detail: string; ready: boolean };
const sources: Record<LinkedQRKind, { url: string; key: string; create: string; empty: string }> = {
  linkpage: { url: '/api/linkpages', key: 'linkpages', create: '/linkpages', empty: 'No Linkpages yet.' },
  card: { url: '/api/cards', key: 'cards', create: '/cards', empty: 'No cards yet.' },
  form: { url: '/api/forms', key: 'forms', create: '/forms', empty: 'No forms yet.' },
  file: { url: '/api/assets', key: 'items', create: '/assets', empty: 'Your library is empty.' },
};

/** Lists what a linked QR code can open; pages, cards and forms must be published first. */
export function LinkedItemPicker({ kind, value, onSelect }: { kind: LinkedQRKind; value: string | null; onSelect: (item: { id: string; title: string }) => void }) {
  const { t } = useTranslation('creation');
  const id = useId();
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    const source = sources[kind];
    fetch(source.url, { credentials: 'same-origin' }).then(response => response.ok ? response.json() : {}).then(body => {
      if (!alive) return;
      const rows = ((body as Record<string, unknown>)[source.key] ?? []) as Record<string, unknown>[];
      setItems(rows.map(row => kind === 'file'
        ? { id: String(row.id), title: String(row.name), detail: String(row.mime_type), ready: true }
        : { id: String(row.id), title: String(row.title), detail: `/${kind === 'linkpage' ? 'p' : kind === 'card' ? 'c' : 'f'}/${row.slug}`, ready: Boolean(row.is_published) }));
    }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [kind]);

  if (!items) return <Loader2 className="size-5 animate-spin" aria-label={t('Loading')} />;
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{t(sources[kind].empty)} <Link className="text-primary hover:underline" href={sources[kind].create}>{t('Create one')}</Link></p>;
  return <fieldset className="space-y-2">
    <legend className="text-sm font-medium">{t('Choose what the QR code opens')}</legend>
    <ul className="space-y-2">{items.map(item => <li key={item.id}>
      <label className={`flex items-center gap-3 rounded-md border p-3 text-sm ${item.ready ? 'cursor-pointer hover:bg-muted' : 'opacity-60'} ${value === item.id ? 'border-primary ring-1 ring-primary' : ''}`}>
        <input type="radio" name={`${id}-item`} checked={value === item.id} disabled={!item.ready} onChange={() => onSelect({ id: item.id, title: item.title })} />
        <span className="min-w-0 flex-1"><span className="block truncate font-medium" dir="auto">{item.title}</span>
          <span className="block truncate text-xs text-muted-foreground" dir="ltr">{item.detail}</span></span>
        {!item.ready && <span className="text-xs">{t('Publish it first')}</span>}
      </label>
    </li>)}</ul>
  </fieldset>;
}
