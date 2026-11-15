'use client';

import { Folder, FolderPlus, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { qrControl, type QROrganization } from '@/components/QRListFilters';
import { qrListHref, type QRListQuery } from '@/lib/qr-list';
import type { QRCodeRecord } from '@/lib/qr-types';

type Kind = 'folder' | 'label';

export function QRCollections({ query, organization, onChanged }: {
  query: QRListQuery; organization: QROrganization; onChanged: () => void;
}) {
  const { t: copy } = useTranslation('copy');
  const panel = useId();
  const [kind, setKind] = useState<Kind | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function choose(next: Kind) {
    setKind(current => current === next ? null : next);
    setEditing(null);
    setName('');
    setMessage('');
  }

  async function change(action: 'create' | 'rename' | 'delete', id?: string) {
    if (!kind) return;
    if (action === 'delete' && !window.confirm(copy(kind === 'folder'
      ? 'Delete this folder? Its QR Codes will be kept.'
      : 'Delete this label? It will be removed from all QR Codes.'))) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/qr-codes/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, collection: kind, id, ...(action === 'delete' ? {} : { name }) }),
      });
      if (response.status === 409) {
        setMessage('This name is already in use.');
        return;
      }
      if (!response.ok) throw new Error();
      setEditing(null);
      setName('');
      setMessage('Changes saved.');
      onChanged();
    } catch {
      setMessage('Could not save changes. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim()) void change(editing ? 'rename' : 'create', editing?.id);
  }

  const entries = kind === 'folder' ? organization.folders : organization.labels;
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant={kind === 'folder' ? 'secondary' : 'outline'} className="min-h-11 gap-2"
        aria-expanded={kind === 'folder'} aria-controls={panel} disabled={busy} onClick={() => choose('folder')}>
        <Folder className="size-4" aria-hidden="true" />{copy('Folders')}
      </Button>
      <Button type="button" variant={kind === 'label' ? 'secondary' : 'outline'} className="min-h-11 gap-2"
        aria-expanded={kind === 'label'} aria-controls={panel} disabled={busy} onClick={() => choose('label')}>
        <Tags className="size-4" aria-hidden="true" />{copy('Labels')}
      </Button>
    </div>
    <div id={panel} hidden={!kind} className="rounded-lg border bg-card p-4">
      {kind && <>
        <h2 className="mb-1 text-base font-semibold">{copy(kind === 'folder' ? 'Manage folders' : 'Manage labels')}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{copy(kind === 'folder'
          ? 'Group QR Codes in folders. Each code can belong to one folder.'
          : 'Use labels to identify QR Codes across folders.')}</p>
        {entries.length > 0 && <ul className="mb-3 grid gap-2 sm:grid-cols-2">
          {entries.map(item => <li key={item.id} className="flex min-w-0 items-center rounded-md border ps-3">
            <Link href={qrListHref({ ...query, [kind]: item.id, page: 1, focus: '' })}
              className="min-w-0 flex-1 truncate py-2 text-sm font-medium text-primary hover:underline" title={item.name}>{item.name}</Link>
            <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" disabled={busy}
              aria-label={copy('Rename {{name}}', { name: item.name })} onClick={() => {
                setEditing(item); setName(item.name); setMessage('');
                document.getElementById(panel + '-name')?.focus();
              }}><Pencil size={15} aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-destructive" disabled={busy}
              aria-label={copy('Delete {{name}}', { name: item.name })} onClick={() => void change('delete', item.id)}>
              <Trash2 size={15} aria-hidden="true" /></Button>
          </li>)}
        </ul>}
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <label className="min-w-40 flex-1 text-xs font-medium">
            {copy(kind === 'folder' ? 'Folder name' : 'Label name')}
            <input id={panel + '-name'} required maxLength={80} value={name} className={qrControl + ' mt-1'}
              onChange={event => setName(event.target.value)} />
          </label>
          <Button type="submit" className="min-h-11 gap-2" disabled={busy || !name.trim()}>
            {editing ? <Pencil size={16} aria-hidden="true" /> : kind === 'folder' ? <FolderPlus size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {copy(editing ? 'Save name' : kind === 'folder' ? 'New Folder' : 'New Label')}
          </Button>
          {editing && <Button type="button" variant="outline" disabled={busy} className="min-h-11" onClick={() => {
            setEditing(null); setName(''); setMessage('');
          }}>{copy('Cancel')}</Button>}
        </form>
        {message && <p role="status" className="mt-2 text-sm">{copy(message)}</p>}
      </>}
    </div>
  </div>;
}

export function QRCodeOrganization({ qr, organization, busy, onChange }: {
  qr: QRCodeRecord; organization: QROrganization; busy: boolean;
  onChange: (body: { folderId: string | null } | { labelId: string; labeled: boolean }) => void;
}) {
  const { t: copy } = useTranslation('copy');
  return <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4">
    <label className="text-sm font-medium">{copy('Move to folder')}
      <select className={qrControl + ' mt-1'} disabled={busy} value={qr.folder_id ?? ''}
        onChange={event => onChange({ folderId: event.target.value || null })}>
        <option value="">{copy('No folder')}</option>
        {organization.folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
      </select>
    </label>
    <fieldset className="space-y-2" disabled={busy}>
      <legend className="mb-2 text-sm font-medium">{copy('Labels')}</legend>
      {!organization.labels.length
        ? <p className="text-sm text-muted-foreground">{copy('Create labels to assign them to this QR Code.')}</p>
        : <div className="flex flex-wrap gap-2">
          {organization.labels.map(label => <label key={label.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm">
            <input type="checkbox" className="size-4 accent-blue-700" checked={qr.label_ids?.includes(label.id) ?? false}
              onChange={event => onChange({ labelId: label.id, labeled: event.target.checked })} />
            <span dir="auto" className="break-all">{label.name}</span>
          </label>)}
        </div>}
    </fieldset>
  </div>;
}
