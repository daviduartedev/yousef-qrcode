'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, FolderPlus, Loader2, Pencil, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { assetAccept, formatBytes, type AssetPage, type AssetRecord } from '@/lib/assets';
import { assetRequest, uploadAssetFile } from '@/lib/asset-client';
import { forgetAssetImage } from '@/lib/asset-image';

const field = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';
export type AssetView = { q: string; kind: 'image' | 'document' | null; folder: string | null; page: number };

function href(view: AssetView, change: Partial<AssetView> = {}) {
  const next = { ...view, page: 1, ...change };
  const query = new URLSearchParams();
  if (next.q) query.set('q', next.q);
  if (next.kind) query.set('kind', next.kind);
  if (next.folder) query.set('folder', next.folder);
  if (next.page > 1) query.set('page', String(next.page));
  const search = query.toString();
  return search ? `/assets?${search}` : '/assets';
}

function AssetCard({ asset, folders, onChanged, onError }: {
  asset: AssetRecord; folders: AssetPage['folders']; onChanged: () => void; onError: (message: string) => void;
}) {
  const { t, i18n } = useTranslation('assets');
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(asset.name);
  const [busy, setBusy] = useState(false);

  async function save(change: { name?: string; folder_id?: string | null }) {
    setBusy(true);
    const result = await assetRequest(`/api/assets/${asset.id}`, 'PATCH', change);
    setBusy(false);
    if (!result.ok) { onError(t(result.error)); return; }
    setEditing(false);
    onChanged();
  }

  async function remove() {
    const warning = asset.qr_uses
      ? t('Delete "{{name}}"? {{count}} QR codes use it as a logo and will show no logo. Codes already printed keep working.', { name: asset.name, count: asset.qr_uses })
      : t('Delete "{{name}}"? This cannot be undone.', { name: asset.name });
    if (!window.confirm(warning)) return;
    setBusy(true);
    const result = await assetRequest(`/api/assets/${asset.id}`, 'DELETE');
    setBusy(false);
    if (!result.ok) { onError(t(result.error)); return; }
    forgetAssetImage(asset.id);
    onChanged();
  }

  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-md border bg-card shadow-sm">
      <div className="flex aspect-[4/3] items-center justify-center bg-muted/60 p-3">
        {asset.kind === 'image'
          ? <img src={`/api/assets/${asset.id}/file`} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
          : <FileText className="size-12 text-muted-foreground" aria-hidden="true" />}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {editing ? (
          <form className="flex gap-2" onSubmit={event => { event.preventDefault(); void save({ name }); }}>
            <label htmlFor={`${id}-name`} className="sr-only">{t('File name')}</label>
            <input id={`${id}-name`} className={field} value={name} maxLength={120} onChange={event => setName(event.target.value)} autoFocus dir="auto" />
            <Button type="submit" size="sm" disabled={busy}>{t('Save')}</Button>
          </form>
        ) : <h3 className="truncate font-medium" dir="auto" title={asset.name}>{asset.name}</h3>}
        <p className="text-xs text-muted-foreground">
          {asset.kind === 'image' && asset.width ? `${asset.width}×${asset.height} · ` : ''}{formatBytes(asset.size_bytes, i18n.resolvedLanguage)}
          {asset.qr_uses > 0 && <> · {t('Used by {{count}} QR codes', { count: asset.qr_uses })}</>}
        </p>
        <label htmlFor={`${id}-folder`} className="sr-only">{t('Folder for {{name}}', { name: asset.name })}</label>
        <select id={`${id}-folder`} className={field} value={asset.folder_id ?? ''} disabled={busy}
          onChange={event => void save({ folder_id: event.target.value || null })}>
          <option value="">{t('No folder')}</option>
          {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
        <div className="mt-auto flex flex-wrap gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => { setName(asset.name); setEditing(!editing); }} aria-label={t('Rename {{name}}', { name: asset.name })}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={`/api/assets/${asset.id}/file?download=1`} aria-label={t('Download {{name}}', { name: asset.name })}><Download className="size-4" aria-hidden="true" /></a>
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void remove()} aria-label={t('Delete {{name}}', { name: asset.name })}>
            <Trash2 className="size-4 text-destructive" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </li>
  );
}

export default function Assets({ data, view }: { data: AssetPage; view: AssetView }) {
  const { t, i18n } = useTranslation('assets');
  const router = useRouter();
  const uploadId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [folderName, setFolderName] = useState('');
  const refresh = () => router.refresh();
  const { usage } = data;
  const percent = Math.min(100, Math.round((usage.bytes / usage.maxBytes) * 100));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setStatus(null);
    const failures: string[] = [];
    let done = 0;
    for (const file of Array.from(files)) {
      const result = await uploadAssetFile(file, view.folder && view.folder !== 'none' ? view.folder : null);
      if ('error' in result) failures.push(`${file.name}: ${t(result.error)}`);
      else done++;
    }
    setUploading(false);
    if (input.current) input.current.value = '';
    setStatus(failures.length
      ? { tone: 'error', text: [t('{{count}} files uploaded.', { count: done }), ...failures].join(' ') }
      : { tone: 'success', text: t('{{count}} files uploaded.', { count: done }) });
    refresh();
  }

  async function folderAction(body: unknown) {
    const result = await assetRequest('/api/asset-folders', 'POST', body);
    if (!result.ok) { setStatus({ tone: 'error', text: t(result.error) }); return false; }
    refresh();
    return true;
  }

  const activeFolder = data.folders.find(folder => folder.id === view.folder);
  return <WorkspaceShell>
    <main className="space-y-5 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('Asset library')}</h1>
          <p className="text-sm text-muted-foreground">{t('Upload images and PDFs once and reuse them in your QR codes.')}</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={input} id={uploadId} type="file" multiple accept={assetAccept} className="sr-only" disabled={uploading}
            onChange={event => void upload(event.target.files)} />
          <Button asChild disabled={uploading}>
            <label htmlFor={uploadId} className="cursor-pointer">
              {uploading ? <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" /> : <Upload className="me-2 size-4" aria-hidden="true" />}
              {t('Upload files')}
            </label>
          </Button>
        </div>
      </div>

      <section aria-label={t('Storage used')} className="rounded-md border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span>{t('{{used}} of {{total}} used', { used: formatBytes(usage.bytes, i18n.resolvedLanguage), total: formatBytes(usage.maxBytes, i18n.resolvedLanguage) })}</span>
          <span className="text-muted-foreground">{t('{{files}} of {{max}} files', { files: usage.files, max: usage.maxFiles })}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t('Storage used')}>
          <div className="h-full rounded-full bg-blue-700" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t('PNG, JPEG, WebP, GIF and PDF up to 4 MB each. SVG files are not accepted.')}</p>
      </section>

      {status && <p role={status.tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${status.tone === 'error' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-emerald-500/40 bg-emerald-500/10'}`}>{status.text}</p>}

      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label={t('Folders')} className="space-y-3">
          <ul className="space-y-1 text-sm">
            <li><Link href={href(view, { folder: null })} aria-current={!view.folder ? 'page' : undefined} className={`block rounded-md px-3 py-2 hover:bg-muted ${!view.folder ? 'bg-muted font-medium' : ''}`}>{t('All files')}</Link></li>
            <li><Link href={href(view, { folder: 'none' })} aria-current={view.folder === 'none' ? 'page' : undefined} className={`block rounded-md px-3 py-2 hover:bg-muted ${view.folder === 'none' ? 'bg-muted font-medium' : ''}`}>{t('No folder')}</Link></li>
            {data.folders.map(folder => <li key={folder.id}>
              <Link href={href(view, { folder: folder.id })} aria-current={view.folder === folder.id ? 'page' : undefined}
                className={`flex justify-between gap-2 rounded-md px-3 py-2 hover:bg-muted ${view.folder === folder.id ? 'bg-muted font-medium' : ''}`}>
                <span className="truncate" dir="auto">{folder.name}</span><span className="tabular-nums text-muted-foreground">{folder.files}</span>
              </Link>
            </li>)}
          </ul>
          <form className="flex gap-2" onSubmit={async event => { event.preventDefault(); if (await folderAction({ action: 'create', name: folderName })) setFolderName(''); }}>
            <label htmlFor={`${uploadId}-folder`} className="sr-only">{t('New folder name')}</label>
            <input id={`${uploadId}-folder`} className={field} placeholder={t('New folder')} value={folderName} maxLength={80} onChange={event => setFolderName(event.target.value)} dir="auto" />
            <Button type="submit" variant="outline" size="icon" className="size-11 shrink-0" aria-label={t('Create folder')} disabled={!folderName.trim()}>
              <FolderPlus className="size-4" aria-hidden="true" />
            </Button>
          </form>
          {activeFolder && <div className="flex flex-wrap gap-2 text-sm">
            <button type="button" className="text-primary hover:underline" onClick={() => {
              const name = window.prompt(t('Rename folder'), activeFolder.name);
              if (name) void folderAction({ action: 'rename', id: activeFolder.id, name });
            }}>{t('Rename folder')}</button>
            <button type="button" className="text-destructive hover:underline" onClick={() => {
              if (window.confirm(t('Delete the folder "{{name}}"? Its files stay in the library.', { name: activeFolder.name })))
                void folderAction({ action: 'delete', id: activeFolder.id }).then(ok => { if (ok) router.push(href(view, { folder: null })); });
            }}>{t('Delete folder')}</button>
          </div>}
        </nav>

        <div className="min-w-0 space-y-4">
          <form action="/assets" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
            {view.folder && <input type="hidden" name="folder" value={view.folder} />}
            <label htmlFor={`${uploadId}-q`} className="sr-only">{t('Search files')}</label>
            <input id={`${uploadId}-q`} name="q" type="search" defaultValue={view.q} placeholder={t('Search files')} className={field} dir="auto" />
            <label htmlFor={`${uploadId}-kind`} className="sr-only">{t('File type')}</label>
            <select id={`${uploadId}-kind`} name="kind" defaultValue={view.kind ?? ''} className={field}>
              <option value="">{t('All types')}</option>
              <option value="image">{t('Images')}</option>
              <option value="document">{t('PDF documents')}</option>
            </select>
            <Button type="submit" variant="outline" className="min-h-11">{t('Search')}</Button>
          </form>
          <p className="text-sm text-muted-foreground" aria-live="polite">{t('{{count}} files', { count: data.total })}</p>
          {data.items.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              {view.q || view.kind || view.folder ? t('No files match these filters.') : t('Your library is empty. Upload a logo or document to get started.')}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {data.items.map(asset => <AssetCard key={asset.id + asset.updated_at} asset={asset} folders={data.folders} onChanged={refresh}
                onError={text => setStatus({ tone: 'error', text })} />)}
            </ul>
          )}
          {data.pageCount > 1 && <nav aria-label={t('Pages')} className="flex items-center justify-between gap-2 text-sm">
            {data.page > 1 ? <Link className="text-primary hover:underline" href={href(view, { page: data.page - 1 })}>{t('Previous')}</Link> : <span />}
            <span>{t('Page {{page}} of {{count}}', { page: data.page, count: data.pageCount })}</span>
            {data.page < data.pageCount ? <Link className="text-primary hover:underline" href={href(view, { page: data.page + 1 })}>{t('Next')}</Link> : <span />}
          </nav>}
        </div>
      </div>
    </main>
  </WorkspaceShell>;
}
