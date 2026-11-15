'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, ExternalLink, FileUp, Loader2, QrCode, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { CardView } from '@/components/cards/CardView';
import { LinkpageStatus } from '@/views/Linkpages';
import { LibraryLogoPicker } from '@/components/assets/LibraryLogoPicker';
import { assetRequest } from '@/lib/asset-client';
import { buttonStyles, linkpageThemes, socialNetworks, themePreset, validSlug } from '@/lib/linkpages';
import { cardContentSchema, cardLimits, parseVCard, type CardContent, type CardRecord } from '@/lib/cards';

const field = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';
type SaveState = 'saved' | 'pending' | 'saving' | 'invalid' | 'error';
const tabs = [['profile', 'Profile'], ['contact', 'Contact'], ['links', 'Social links'], ['style', 'Style'], ['exchange', 'Contact exchange'], ['settings', 'Settings']] as const;
type Tab = (typeof tabs)[number][0];

export default function CardEditor({ initial, origin }: { initial: CardRecord; origin: string }) {
  const { t } = useTranslation('cards');
  const router = useRouter();
  const id = useId();
  const [card, setCard] = useState(initial);
  const [draft, setDraft] = useState<CardContent>(initial.draft);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [tab, setTab] = useState<Tab>('profile');
  const [save, setSave] = useState<SaveState>('saved');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const first = useRef(true);
  const version = useRef(0);
  const latest = useRef({ draft, title });
  latest.current = { draft, title };

  const persist = useCallback(async () => {
    if (!cardContentSchema.safeParse(latest.current.draft).success || !latest.current.title.trim()) { setSave('invalid'); return; }
    setSave('saving');
    const sentVersion = version.current;
    const result = await assetRequest(`/api/cards/${initial.id}`, 'PATCH', { draft: latest.current.draft, title: latest.current.title.trim() });
    if (!result.ok) { setSave('error'); setMessage({ tone: 'error', text: t(result.error) }); return; }
    setCard(result.value.card);
    setSave(version.current === sentVersion ? 'saved' : 'pending');
  }, [initial.id, t]);

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

  const set = <K extends keyof CardContent>(key: K, change: Partial<CardContent[K]>) =>
    setDraft(previous => ({ ...previous, [key]: { ...(previous[key] as object), ...change } }));
  const input = (key: string, label: string, value: string, onChange: (value: string) => void, props: React.InputHTMLAttributes<HTMLInputElement> = {}) =>
    <div className="space-y-1"><label htmlFor={`${id}-${key}`} className="text-sm font-medium">{label}</label>
      <input id={`${id}-${key}`} className={field} value={value} onChange={event => onChange(event.target.value)} dir="auto" {...props} /></div>;

  async function importVCard(file: File | undefined) {
    if (!file) return;
    if (file.size > cardLimits.vcardMaxBytes) { setMessage({ tone: 'error', text: t('The vCard file is too large.') }); return; }
    const parsed = parseVCard(await file.text());
    if (!parsed || !parsed.firstName) { setMessage({ tone: 'error', text: t('No contact was found in this file.') }); return; }
    setDraft(previous => ({ ...previous,
      person: { ...previous.person, firstName: parsed.firstName ?? previous.person.firstName, lastName: parsed.lastName ?? '', title: parsed.title ?? previous.person.title,
        company: parsed.company ?? previous.person.company, bio: parsed.bio ?? previous.person.bio },
      contact: { phones: parsed.phones?.length ? parsed.phones : previous.contact.phones, emails: parsed.emails?.length ? parsed.emails : previous.contact.emails,
        website: parsed.website ?? previous.contact.website, address: parsed.address ?? previous.contact.address } }));
    setMessage({ tone: 'success', text: t('Contact imported. Review the fields before publishing.') });
  }

  async function publish(value: boolean) {
    setBusy(true);
    setMessage(null);
    if (save !== 'saved') await persist();
    const result = await assetRequest(`/api/cards/${initial.id}/publish`, 'POST', { publish: value });
    setBusy(false);
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
    setCard(result.value.card);
    setMessage({ tone: 'success', text: t(value ? 'Published. Your card is live.' : 'Unpublished. The address now shows “page not found”.') });
  }

  async function saveSlug() {
    if (!validSlug(slug)) { setMessage({ tone: 'error', text: t('Use 3–40 lowercase letters, numbers or hyphens') }); return; }
    const result = await assetRequest(`/api/cards/${initial.id}`, 'PATCH', { slug });
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
    setCard(result.value.card);
    setMessage({ tone: 'success', text: t('Address saved.') });
  }

  async function createQr() {
    setBusy(true);
    const result = await assetRequest(`/api/cards/${initial.id}/qr`, 'POST');
    setBusy(false);
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
    router.push(`/app?edit=${encodeURIComponent(result.value.qr_code_id)}`);
  }

  const saveText = { saved: 'All changes saved', pending: 'Unsaved changes', saving: 'Saving…', invalid: 'Complete the highlighted fields to save', error: 'Could not save. Retrying on the next change.' }[save];
  const locked = Boolean(card.published_at || card.qr_code_id);

  return <WorkspaceShell>
    <main className="space-y-5 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Link href="/cards" className="text-sm text-primary hover:underline">{t('All cards')}</Link>
          <label htmlFor={`${id}-title`} className="sr-only">{t('Card name')}</label>
          <input id={`${id}-title`} value={title} maxLength={80} onChange={event => setTitle(event.target.value)} dir="auto"
            className="block w-full rounded-md border border-transparent bg-transparent px-1 text-2xl font-semibold tracking-tight hover:border-input focus-visible:ring-2 focus-visible:ring-ring" />
          <div className="flex flex-wrap items-center gap-2 text-sm"><LinkpageStatus page={card} />
            <span role="status" className={save === 'invalid' || save === 'error' ? 'text-destructive' : 'text-muted-foreground'}>{t(saveText)}</span></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {card.is_published && <Button asChild variant="outline"><a href={`/c/${card.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="me-2 size-4" aria-hidden="true" />{t('View card')}</a></Button>}
          <Button asChild variant="outline"><Link href={`/cards/${card.id}/analytics`}><BarChart3 className="me-2 size-4" aria-hidden="true" />{t('Analytics')}</Link></Button>
          {card.is_published && <Button variant="outline" disabled={busy} onClick={() => void publish(false)}>{t('Unpublish')}</Button>}
          <Button disabled={busy || save === 'invalid'} onClick={() => void publish(true)}>{busy && <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />}{t(card.is_published ? 'Publish changes' : 'Publish')}</Button>
        </div>
      </div>
      {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${message.tone === 'error' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-emerald-500/40 bg-emerald-500/10'}`}>{message.text}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <div role="tablist" aria-label={t('Editor sections')} className="flex flex-wrap gap-2 border-b">
            {tabs.map(([key, label]) => <button key={key} role="tab" type="button" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t(label)}</button>)}
          </div>

          {tab === 'profile' && <section role="tabpanel" aria-label={t('Profile')} className="space-y-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
              <FileUp className="size-4" aria-hidden="true" />{t('Import from vCard (.vcf)')}
              <input type="file" accept=".vcf,text/vcard,text/x-vcard" className="sr-only" onChange={event => { void importVCard(event.target.files?.[0]); event.target.value = ''; }} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {input('first', t('First name'), draft.person.firstName, value => set('person', { firstName: value }), { maxLength: 60, required: true, 'aria-invalid': !draft.person.firstName.trim() })}
              {input('last', t('Last name'), draft.person.lastName, value => set('person', { lastName: value }), { maxLength: 60 })}
              {input('job', t('Job title'), draft.person.title, value => set('person', { title: value }), { maxLength: 80 })}
              {input('company', t('Company'), draft.person.company, value => set('person', { company: value }), { maxLength: 80 })}
            </div>
            <div className="space-y-1"><label htmlFor={`${id}-bio`} className="text-sm font-medium">{t('About')}</label>
              <textarea id={`${id}-bio`} className={`${field} min-h-20 py-2`} value={draft.person.bio} maxLength={400} dir="auto" onChange={event => set('person', { bio: event.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <LibraryLogoPicker title={t('Photo')} selected={draft.person.photoAssetId} onSelect={assetId => set('person', { photoAssetId: assetId })} />
              <LibraryLogoPicker title={t('Cover image')} selected={draft.person.coverAssetId} onSelect={assetId => set('person', { coverAssetId: assetId })} />
            </div>
          </section>}

          {tab === 'contact' && <section role="tabpanel" aria-label={t('Contact')} className="space-y-5">
            {(['phones', 'emails'] as const).map(kind => <fieldset key={kind} className="space-y-2">
              <legend className="text-sm font-semibold">{t(kind === 'phones' ? 'Phone numbers' : 'Email addresses')}</legend>
              {draft.contact[kind].map((item, index) => <div key={index} className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`${id}-${kind}-${index}-label`}>{t('Type')}</label>
                <select id={`${id}-${kind}-${index}-label`} className={`${field} w-32`} value={item.label}
                  onChange={event => set('contact', { [kind]: draft.contact[kind].map((old, at) => at === index ? { ...old, label: event.target.value } : old) } as Partial<CardContent['contact']>)}>
                  {(kind === 'phones' ? ['mobile', 'work', 'home'] : ['work', 'personal']).map(option => <option key={option} value={option}>{t(option)}</option>)}
                </select>
                <label className="sr-only" htmlFor={`${id}-${kind}-${index}`}>{t(kind === 'phones' ? 'Phone number' : 'Email address')}</label>
                <input id={`${id}-${kind}-${index}`} dir="ltr" type={kind === 'phones' ? 'tel' : 'email'} className={`${field} flex-1`}
                  value={'number' in item ? item.number : item.address}
                  onChange={event => set('contact', { [kind]: draft.contact[kind].map((old, at) => at === index ? { ...old, [kind === 'phones' ? 'number' : 'address']: event.target.value } : old) } as Partial<CardContent['contact']>)} />
                <Button type="button" variant="ghost" size="icon" aria-label={t('Remove')} onClick={() => set('contact', { [kind]: draft.contact[kind].filter((_, at) => at !== index) } as Partial<CardContent['contact']>)}>
                  <Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button>
              </div>)}
              <Button type="button" variant="outline" size="sm" disabled={draft.contact[kind].length >= (kind === 'phones' ? cardLimits.maxPhones : cardLimits.maxEmails)}
                onClick={() => set('contact', { [kind]: [...draft.contact[kind], kind === 'phones' ? { label: 'mobile', number: '' } : { label: 'work', address: '' }] } as Partial<CardContent['contact']>)}>
                + {t(kind === 'phones' ? 'Add phone' : 'Add email')}</Button>
            </fieldset>)}
            {input('website', t('Website'), draft.contact.website, value => set('contact', { website: value }), { type: 'url', dir: 'ltr', placeholder: 'https://' })}
            {input('address', t('Address'), draft.contact.address, value => set('contact', { address: value }), { maxLength: 200 })}
          </section>}

          {tab === 'links' && <section role="tabpanel" aria-label={t('Social links')} className="space-y-3">
            {draft.links.map((link, index) => <div key={index} className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor={`${id}-net-${index}`}>{t('Network')}</label>
              <select id={`${id}-net-${index}`} className={`${field} w-36`} value={link.network}
                onChange={event => setDraft(previous => ({ ...previous, links: previous.links.map((old, at) => at === index ? { ...old, network: event.target.value as typeof old.network } : old) }))}>
                {socialNetworks.map(network => <option key={network} value={network}>{network === 'x' ? 'X' : network[0].toUpperCase() + network.slice(1)}</option>)}
              </select>
              <label className="sr-only" htmlFor={`${id}-url-${index}`}>{t('Web address')}</label>
              <input id={`${id}-url-${index}`} dir="ltr" type="url" className={`${field} flex-1`} value={link.url}
                onChange={event => setDraft(previous => ({ ...previous, links: previous.links.map((old, at) => at === index ? { ...old, url: event.target.value } : old) }))} />
              <Button type="button" variant="ghost" size="icon" aria-label={t('Remove')} onClick={() => setDraft(previous => ({ ...previous, links: previous.links.filter((_, at) => at !== index) }))}>
                <Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button>
            </div>)}
            <Button type="button" variant="outline" size="sm" disabled={draft.links.length >= cardLimits.maxLinks}
              onClick={() => setDraft(previous => ({ ...previous, links: [...previous.links, { network: 'linkedin', url: 'https://' }] }))}>+ {t('Add social link')}</Button>
          </section>}

          {tab === 'style' && <section role="tabpanel" aria-label={t('Style')} className="space-y-4">
            <fieldset className="space-y-2"><legend className="text-sm font-medium">{t('Theme')}</legend>
              <div className="flex flex-wrap gap-2">{linkpageThemes.map(name => <label key={name} className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${draft.theme.preset === name ? 'ring-2 ring-primary' : ''}`}>
                <input type="radio" className="sr-only" name={`${id}-theme`} checked={draft.theme.preset === name} onChange={() => set('theme', { ...themePreset(name), buttonStyle: draft.theme.buttonStyle })} />
                {t(name[0].toUpperCase() + name.slice(1))}</label>)}</div></fieldset>
            <div className="grid gap-3 sm:grid-cols-2">{([['background', 'Background'], ['text', 'Text color'], ['button', 'Button color'], ['buttonText', 'Button text color']] as const).map(([key, label]) =>
              <div key={key} className="flex items-center gap-3"><input id={`${id}-${key}`} type="color" value={draft.theme[key]} onChange={event => set('theme', { [key]: event.target.value })} className="h-11 w-14 rounded border" />
                <label htmlFor={`${id}-${key}`} className="text-sm">{t(label)}</label></div>)}</div>
            <fieldset className="space-y-2"><legend className="text-sm font-medium">{t('Button shape')}</legend>
              <div className="flex flex-wrap gap-2">{buttonStyles.map(style => <label key={style} className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${draft.theme.buttonStyle === style ? 'ring-2 ring-primary' : ''}`}>
                <input type="radio" className="sr-only" name={`${id}-shape`} checked={draft.theme.buttonStyle === style} onChange={() => set('theme', { buttonStyle: style })} />{t(style[0].toUpperCase() + style.slice(1))}</label>)}</div></fieldset>
          </section>}

          {tab === 'exchange' && <section role="tabpanel" aria-label={t('Contact exchange')} className="space-y-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={draft.exchange.enabled} onChange={event => set('exchange', { enabled: event.target.checked })} />
              {t('Let visitors share their contact with me')}</label>
            <div className="space-y-1"><label htmlFor={`${id}-purpose`} className="text-sm font-medium">{t('Why you ask for their details')}</label>
              <textarea id={`${id}-purpose`} className={`${field} min-h-20 py-2`} maxLength={300} dir="auto" value={draft.exchange.purpose} onChange={event => set('exchange', { purpose: event.target.value })} />
              <p className="text-xs text-muted-foreground">{t('Visitors see this text next to the consent checkbox. It is stored with every contact they send.')}</p></div>
            <Link href="/cards/contacts" className="text-sm text-primary hover:underline">{t('Open contacts')}</Link>
          </section>}

          {tab === 'settings' && <section role="tabpanel" aria-label={t('Settings')} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor={`${id}-slug`} className="text-sm font-medium">{t('Card address')}</label>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground" dir="ltr">{origin}/c/</span>
                <input id={`${id}-slug`} className={`${field} max-w-xs`} dir="ltr" value={slug} disabled={locked} onChange={event => setSlug(event.target.value.toLowerCase())} />
                {!locked && <Button type="button" variant="outline" onClick={() => void saveSlug()} disabled={slug === card.slug}>{t('Save address')}</Button>}
              </div>
              <p className="text-xs text-muted-foreground">{t(locked ? 'The address is fixed after the first publication or QR code so shared links and printed QR codes keep working.' : 'You can change the address until you publish or create a QR code.')}</p>
            </div>
            <div className="space-y-2 rounded-md border p-4">
              <h2 className="text-base font-semibold">{t('QR code for this card')}</h2>
              <p className="text-sm text-muted-foreground">{t('The QR code opens {{url}}. Editing the card later never changes it.', { url: `${origin}/c/${card.slug}` })}</p>
              {card.qr_code_id ? <Button asChild variant="outline"><Link href={`/app?edit=${encodeURIComponent(card.qr_code_id)}`}><QrCode className="me-2 size-4" aria-hidden="true" />{t('Open QR code')}</Link></Button>
                : <Button type="button" onClick={() => void createQr()} disabled={busy}><QrCode className="me-2 size-4" aria-hidden="true" />{t('Create QR code')}</Button>}
            </div>
          </section>}
        </div>
        <aside aria-label={t('Mobile preview')} className="lg:sticky lg:top-4 lg:self-start">
          <div className="mx-auto h-[640px] w-full max-w-[22rem] overflow-y-auto rounded-[2rem] border-8 border-slate-900 bg-white shadow-lg"><div inert><CardView content={draft} slug={null} /></div></div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t('Preview of the draft. Visitors see the last published version.')}</p>
        </aside>
      </div>
    </main>
  </WorkspaceShell>;
}
