'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, BarChart3, ExternalLink, Loader2, QrCode, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { LinkpageView } from '@/components/linkpages/LinkpageView';
import { LinkpageStatus } from '@/views/Linkpages';
import { LibraryLogoPicker } from '@/components/assets/LibraryLogoPicker';
import { assetRequest } from '@/lib/asset-client';
import {
  buttonStyles, linkpageBlockSchema, linkpageContentSchema, linkpageLimits, linkpageThemes, newBlockId, socialNetworks, themePreset, validSlug,
  type LinkpageBlock, type LinkpageContent, type LinkpageRecord,
} from '@/lib/linkpages';

const field = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';
type SaveState = 'saved' | 'pending' | 'saving' | 'invalid' | 'error';
const blockTypes = ['link', 'phone', 'email', 'social', 'text', 'separator'] as const;

function emptyBlock(type: (typeof blockTypes)[number]): LinkpageBlock {
  const id = newBlockId();
  switch (type) {
    case 'link': return { id, type, label: '', url: 'https://' };
    case 'phone': return { id, type, label: '', phone: '' };
    case 'email': return { id, type, label: '', email: '' };
    case 'social': return { id, type, network: 'instagram', url: 'https://' };
    case 'text': return { id, type, text: '' };
    default: return { id, type: 'separator' };
  }
}

function BlockEditor({ block, index, count, invalid, onChange, onMove, onRemove }: {
  block: LinkpageBlock; index: number; count: number; invalid: boolean;
  onChange: (block: LinkpageBlock) => void; onMove: (offset: number) => void; onRemove: () => void;
}) {
  const { t } = useTranslation('linkpages');
  const id = useId();
  const typeName = t(block.type === 'link' ? 'Link' : block.type === 'phone' ? 'Phone' : block.type === 'email' ? 'Email' : block.type === 'social' ? 'Social profile' : block.type === 'text' ? 'Text' : 'Separator');
  const input = (key: string, label: string, value: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => <div className="space-y-1">
    <label htmlFor={`${id}-${key}`} className="text-xs font-medium">{label}</label>
    <input id={`${id}-${key}`} className={field} value={value} onChange={event => onChange({ ...block, [key]: event.target.value } as LinkpageBlock)} {...props} />
  </div>;
  return <li className={`space-y-3 rounded-md border bg-card p-3 ${invalid ? 'border-destructive' : ''}`} aria-label={`${typeName} ${index + 1}`}>
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-semibold">{typeName}</span>
      <div className="flex gap-1">
        <Button type="button" size="icon" variant="ghost" className="size-9" disabled={index === 0} onClick={() => onMove(-1)} aria-label={t('Move up')}><ArrowUp className="size-4" aria-hidden="true" /></Button>
        <Button type="button" size="icon" variant="ghost" className="size-9" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={t('Move down')}><ArrowDown className="size-4" aria-hidden="true" /></Button>
        <Button type="button" size="icon" variant="ghost" className="size-9" onClick={onRemove} aria-label={t('Remove block')}><Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button>
      </div>
    </div>
    {'label' in block && input('label', t('Button text'), block.label, { maxLength: 80, dir: 'auto' })}
    {(block.type === 'link' || block.type === 'social') && input('url', t('Web address'), block.url, { type: 'url', inputMode: 'url', dir: 'ltr', maxLength: 2048 })}
    {block.type === 'phone' && input('phone', t('Phone number'), block.phone, { type: 'tel', dir: 'ltr', maxLength: 24 })}
    {block.type === 'email' && input('email', t('Email address'), block.email, { type: 'email', dir: 'ltr', maxLength: 254 })}
    {block.type === 'social' && <div className="space-y-1">
      <label htmlFor={`${id}-network`} className="text-xs font-medium">{t('Network')}</label>
      <select id={`${id}-network`} className={field} value={block.network} onChange={event => onChange({ ...block, network: event.target.value as typeof block.network })}>
        {socialNetworks.map(network => <option key={network} value={network}>{network === 'x' ? 'X' : network[0].toUpperCase() + network.slice(1)}</option>)}
      </select>
    </div>}
    {block.type === 'text' && <div className="space-y-1">
      <label htmlFor={`${id}-text`} className="text-xs font-medium">{t('Text')}</label>
      <textarea id={`${id}-text`} className={`${field} min-h-20 py-2`} value={block.text} maxLength={600} dir="auto" onChange={event => onChange({ ...block, text: event.target.value })} />
    </div>}
    {invalid && <p className="text-xs text-destructive">{t('Complete this block: text and a valid address are required.')}</p>}
  </li>;
}

export default function LinkpageEditor({ initial, origin }: { initial: LinkpageRecord; origin: string }) {
  const { t } = useTranslation('linkpages');
  const router = useRouter();
  const id = useId();
  const [page, setPage] = useState(initial);
  const [draft, setDraft] = useState<LinkpageContent>(initial.draft);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [tab, setTab] = useState<'build' | 'style' | 'settings'>('build');
  const [save, setSave] = useState<SaveState>('saved');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const first = useRef(true);
  const latest = useRef({ draft, title });
  const version = useRef(0);
  latest.current = { draft, title };

  const persist = useCallback(async () => {
    const parsed = linkpageContentSchema.safeParse(latest.current.draft);
    if (!parsed.success || !latest.current.title.trim()) { setSave('invalid'); return; }
    setSave('saving');
    const sent = latest.current;
    const sentVersion = version.current;
    const result = await assetRequest(`/api/linkpages/${initial.id}`, 'PATCH', { draft: sent.draft, title: sent.title.trim() });
    if (!result.ok) { setSave('error'); setMessage({ tone: 'error', text: t(result.error) }); return; }
    setPage(result.value.linkpage);
    setSave(version.current === sentVersion ? 'saved' : 'pending');
  }, [initial.id, t]);

  // Autosave one second after the last change.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    version.current++;
    setSave('pending');
    const timer = setTimeout(() => void persist(), 1000);
    return () => clearTimeout(timer);
  }, [draft, title, persist]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (save === 'pending' || save === 'saving') event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [save]);

  const setProfile = (change: Partial<LinkpageContent['profile']>) => setDraft(previous => ({ ...previous, profile: { ...previous.profile, ...change } }));
  const setTheme = (change: Partial<LinkpageContent['theme']>) => setDraft(previous => ({ ...previous, theme: { ...previous.theme, ...change } }));
  const setBlocks = (update: (blocks: LinkpageBlock[]) => LinkpageBlock[]) => setDraft(previous => ({ ...previous, blocks: update(previous.blocks) }));

  async function publish(value: boolean) {
    setBusy(true);
    setMessage(null);
    if (save !== 'saved') await persist();
    const result = await assetRequest(`/api/linkpages/${initial.id}/publish`, 'POST', { publish: value });
    setBusy(false);
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
    setPage(result.value.linkpage);
    setMessage({ tone: 'success', text: t(value ? 'Published. Your page is live.' : 'Unpublished. The address now shows “page not found”.') });
  }

  async function saveSlug() {
    if (!validSlug(slug)) { setMessage({ tone: 'error', text: t('Use 3–40 lowercase letters, numbers or hyphens') }); return; }
    const result = await assetRequest(`/api/linkpages/${initial.id}`, 'PATCH', { slug });
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
    setPage(result.value.linkpage);
    setMessage({ tone: 'success', text: t('Address saved.') });
  }

  async function createQr() {
    setBusy(true);
    const result = await assetRequest(`/api/linkpages/${initial.id}/qr`, 'POST');
    setBusy(false);
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
    setPage(previous => ({ ...previous, qr_code_id: result.value.qr_code_id }));
    router.push(`/app?edit=${encodeURIComponent(result.value.qr_code_id)}`);
  }

  const invalidBlocks = new Set(draft.blocks.filter(block => !linkpageBlockSchema.safeParse(block).success).map(block => block.id));
  const saveText = { saved: 'All changes saved', pending: 'Unsaved changes', saving: 'Saving…', invalid: 'Complete the highlighted fields to save', error: 'Could not save. Retrying on the next change.' }[save];
  const publicUrl = `${origin}/p/${page.slug}`;
  const tabs = [['build', 'Content'], ['style', 'Style'], ['settings', 'Settings']] as const;

  return <WorkspaceShell>
    <main className="space-y-5 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Link href="/linkpages" className="text-sm text-primary hover:underline">{t('All Linkpages')}</Link>
          <label htmlFor={`${id}-title`} className="sr-only">{t('Page name')}</label>
          <input id={`${id}-title`} value={title} maxLength={80} onChange={event => setTitle(event.target.value)} dir="auto"
            className="block w-full rounded-md border border-transparent bg-transparent px-1 text-2xl font-semibold tracking-tight hover:border-input focus-visible:ring-2 focus-visible:ring-ring" />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <LinkpageStatus page={page} />
            <span role="status" className={save === 'invalid' || save === 'error' ? 'text-destructive' : 'text-muted-foreground'}>{t(saveText)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {page.is_published && <Button asChild variant="outline"><a href={`/p/${page.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="me-2 size-4" aria-hidden="true" />{t('View page')}</a></Button>}
          <Button asChild variant="outline"><Link href={`/linkpages/${page.id}/analytics`}><BarChart3 className="me-2 size-4" aria-hidden="true" />{t('Analytics')}</Link></Button>
          {page.is_published && <Button variant="outline" disabled={busy} onClick={() => void publish(false)}>{t('Unpublish')}</Button>}
          <Button disabled={busy || save === 'invalid'} onClick={() => void publish(true)}>
            {busy && <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />}
            {t(page.is_published ? 'Publish changes' : 'Publish')}
          </Button>
        </div>
      </div>
      {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${message.tone === 'error' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-emerald-500/40 bg-emerald-500/10'}`}>{message.text}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <div role="tablist" aria-label={t('Editor sections')} className="flex gap-2 border-b">
            {tabs.map(([key, label]) => <button key={key} role="tab" type="button" aria-selected={tab === key} aria-controls={`${id}-${key}`} id={`${id}-${key}-tab`}
              onClick={() => setTab(key)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t(label)}</button>)}
          </div>

          {tab === 'build' && <section id={`${id}-build`} role="tabpanel" aria-labelledby={`${id}-build-tab`} className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor={`${id}-name`} className="text-sm font-medium">{t('Display name')}</label>
                <input id={`${id}-name`} className={field} value={draft.profile.name} maxLength={80} dir="auto" onChange={event => setProfile({ name: event.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor={`${id}-bio`} className="text-sm font-medium">{t('Short description')}</label>
                <textarea id={`${id}-bio`} className={`${field} min-h-20 py-2`} value={draft.profile.bio} maxLength={300} dir="auto" onChange={event => setProfile({ bio: event.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <LibraryLogoPicker title={t('Profile photo')} selected={draft.profile.avatarAssetId} onSelect={assetId => setProfile({ avatarAssetId: assetId })} />
              <LibraryLogoPicker title={t('Cover image')} selected={draft.profile.coverAssetId} onSelect={assetId => setProfile({ coverAssetId: assetId })} />
            </div>
            <div className="space-y-3">
              <h2 className="text-base font-semibold">{t('Blocks')}</h2>
              {draft.blocks.length === 0 && <p className="text-sm text-muted-foreground">{t('Add links, contact buttons, social profiles, text or separators.')}</p>}
              <ul className="space-y-3">
                {draft.blocks.map((block, index) => <BlockEditor key={block.id} block={block} index={index} count={draft.blocks.length} invalid={invalidBlocks.has(block.id)}
                  onChange={next => setBlocks(blocks => blocks.map(item => item.id === block.id ? next : item))}
                  onMove={offset => setBlocks(blocks => { const copy = [...blocks]; const [moved] = copy.splice(index, 1); copy.splice(index + offset, 0, moved); return copy; })}
                  onRemove={() => setBlocks(blocks => blocks.filter(item => item.id !== block.id))} />)}
              </ul>
              <div className="flex flex-wrap gap-2" aria-label={t('Add block')} role="group">
                {blockTypes.map(type => <Button key={type} type="button" variant="outline" size="sm" disabled={draft.blocks.length >= linkpageLimits.maxBlocks}
                  onClick={() => setBlocks(blocks => [...blocks, emptyBlock(type)])}>
                  + {t(type === 'link' ? 'Link' : type === 'phone' ? 'Phone' : type === 'email' ? 'Email' : type === 'social' ? 'Social profile' : type === 'text' ? 'Text' : 'Separator')}
                </Button>)}
              </div>
            </div>
          </section>}

          {tab === 'style' && <section id={`${id}-style`} role="tabpanel" aria-labelledby={`${id}-style-tab`} className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t('Theme')}</legend>
              <div className="flex flex-wrap gap-2">
                {linkpageThemes.map(name => { const preset = themePreset(name); return <label key={name} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${draft.theme.preset === name ? 'ring-2 ring-primary' : ''}`}>
                  <input type="radio" name={`${id}-theme`} className="sr-only" checked={draft.theme.preset === name} onChange={() => setTheme({ ...themePreset(name), buttonStyle: draft.theme.buttonStyle })} />
                  <span className="size-5 rounded-full border" style={{ background: preset.background, boxShadow: `inset -8px 0 0 ${preset.button}` }} aria-hidden="true" />
                  {t(name[0].toUpperCase() + name.slice(1))}
                </label>; })}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              {([['background', 'Background'], ['text', 'Text color'], ['button', 'Button color'], ['buttonText', 'Button text color']] as const).map(([key, label]) => <div key={key} className="flex items-center gap-3">
                <input id={`${id}-${key}`} type="color" value={draft.theme[key]} onChange={event => setTheme({ [key]: event.target.value })} className="h-11 w-14 rounded border" />
                <label htmlFor={`${id}-${key}`} className="text-sm">{t(label)}</label>
              </div>)}
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t('Button shape')}</legend>
              <div className="flex flex-wrap gap-2">
                {buttonStyles.map(style => <label key={style} className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${draft.theme.buttonStyle === style ? 'ring-2 ring-primary' : ''}`}>
                  <input type="radio" name={`${id}-shape`} className="sr-only" checked={draft.theme.buttonStyle === style} onChange={() => setTheme({ buttonStyle: style })} />
                  {t(style[0].toUpperCase() + style.slice(1))}
                </label>)}
              </div>
            </fieldset>
          </section>}

          {tab === 'settings' && <section id={`${id}-settings`} role="tabpanel" aria-labelledby={`${id}-settings-tab`} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor={`${id}-slug`} className="text-sm font-medium">{t('Page address')}</label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground" dir="ltr">{origin}/p/</span>
                <input id={`${id}-slug`} className={`${field} max-w-xs`} dir="ltr" value={slug} disabled={Boolean(page.published_at || page.qr_code_id)}
                  onChange={event => setSlug(event.target.value.toLowerCase())} aria-describedby={`${id}-slug-help`} />
                {!page.published_at && !page.qr_code_id && <Button type="button" variant="outline" onClick={() => void saveSlug()} disabled={slug === page.slug}>{t('Save address')}</Button>}
              </div>
              <p id={`${id}-slug-help`} className="text-xs text-muted-foreground">{t(page.published_at || page.qr_code_id
                ? 'The address is fixed after the first publication or QR code so shared links and printed QR codes keep working.'
                : 'You can change the address until you publish or create a QR code.')}</p>
            </div>
            <div className="space-y-2 rounded-md border p-4">
              <h2 className="text-base font-semibold">{t('QR code for this page')}</h2>
              <p className="text-sm text-muted-foreground">{t('The QR code opens {{url}}. Editing the page later never changes it.', { url: publicUrl })}</p>
              {page.qr_code_id
                ? <Button asChild variant="outline"><Link href={`/app?edit=${encodeURIComponent(page.qr_code_id)}`}><QrCode className="me-2 size-4" aria-hidden="true" />{t('Open QR code')}</Link></Button>
                : <Button type="button" onClick={() => void createQr()} disabled={busy}><QrCode className="me-2 size-4" aria-hidden="true" />{t('Create QR code')}</Button>}
            </div>
          </section>}
        </div>

        <aside aria-label={t('Mobile preview')} className="lg:sticky lg:top-4 lg:self-start">
          <div className="mx-auto h-[640px] w-full max-w-[22rem] overflow-y-auto rounded-[2rem] border-8 border-slate-900 bg-white shadow-lg">
            <LinkpageView content={draft} href={() => null} media={assetId => `/api/assets/${assetId}/file`} />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t('Preview of the draft. Visitors see the last published version.')}</p>
        </aside>
      </div>
    </main>
  </WorkspaceShell>;
}
