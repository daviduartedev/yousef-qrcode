'use client';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Loader2 } from 'lucide-react';
import { assetLimits, type AssetPage, type AssetRecord } from '@/lib/assets';
import { uploadAssetFile } from '@/lib/asset-client';

/** Picks a QR logo from the account's own image library, with an inline upload. */
export function LibraryLogoPicker({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const { t } = useTranslation('assets');
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<AssetRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState({ current: 0, count: 1 });

  const load = useCallback(async (next: number) => {
    const response = await fetch(`/api/assets?kind=image&page=${next}`, { credentials: 'same-origin' });
    if (!response.ok) { setError(t('Could not load your library.')); setItems(previous => previous ?? []); return; }
    const body = (await response.json()) as AssetPage;
    setItems(previous => next === 1 || !previous ? body.items : [...previous, ...body.items.filter(item => !previous.some(old => old.id === item.id))]);
    setPage({ current: body.page, count: body.pageCount });
  }, [t]);
  useEffect(() => { void load(1); }, [load]);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { setError(t('Choose an image to use as a logo.')); return; }
    setError(null);
    setUploading(true);
    const result = await uploadAssetFile(file, null);
    setUploading(false);
    if (input.current) input.current.value = '';
    if ('error' in result) { setError(t(result.error)); return; }
    if (result.asset.kind !== 'image') { setError(t('Choose an image to use as a logo.')); return; }
    setItems(previous => [result.asset, ...(previous ?? [])]);
    onSelect(result.asset.id);
  }

  return (
    <section aria-labelledby={`${inputId}-title`} className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${inputId}-title`} className="text-sm font-semibold">{t('From your library')}</h3>
        <Link href="/assets" className="text-sm text-primary hover:underline">{t('Open asset library')}</Link>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {items === null ? <Loader2 className="size-4 animate-spin" aria-label={t('Loading')} /> : (
        <div className="flex flex-wrap gap-2" role="list">
          {items.map(item => (
            <div role="listitem" key={item.id}>
              <button type="button" aria-pressed={selected === item.id} title={item.name}
                onClick={() => onSelect(selected === item.id ? null : item.id)}
                className={`size-14 overflow-hidden rounded-lg border bg-white p-1 ${selected === item.id ? 'ring-2 ring-primary ring-offset-2' : 'hover:bg-muted'}`}>
                <img src={`/api/assets/${item.id}/file`} alt={item.name} className="size-full object-contain" loading="lazy" />
              </button>
            </div>
          ))}
          <div role="listitem">
            <label htmlFor={inputId} className="flex size-14 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
              {uploading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <ImagePlus className="size-5" aria-hidden="true" />}
              <span className="sr-only">{t('Upload image')}</span>
            </label>
            <input ref={input} id={inputId} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only"
              disabled={uploading} onChange={event => void upload(event.target.files?.[0])} />
          </div>
        </div>
      )}
      {page.current < page.count && <button type="button" className="text-sm text-primary hover:underline" onClick={() => void load(page.current + 1)}>{t('Show more')}</button>}
      <p className="text-xs text-muted-foreground">{t('PNG, JPEG, WebP or GIF up to {{size}} MB. A square image with a transparent or white background works best.', { size: assetLimits.maxFileBytes / 1024 / 1024 })}</p>
    </section>
  );
}
