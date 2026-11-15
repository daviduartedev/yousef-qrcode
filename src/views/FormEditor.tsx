'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ExternalLink, Inbox, Loader2, QrCode, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { FormView } from '@/components/forms/FormView';
import { LinkpageStatus } from '@/views/Linkpages';
import { LibraryLogoPicker } from '@/components/assets/LibraryLogoPicker';
import { assetRequest } from '@/lib/asset-client';
import { buttonStyles, linkpageThemes, themePreset, validSlug } from '@/lib/linkpages';
import { fieldTypes, formContentSchema, formFieldSchema, formLimits, newField, type FieldType, type FormContent, type FormField, type FormRecord } from '@/lib/forms';

const field = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';
type SaveState = 'saved' | 'pending' | 'saving' | 'invalid' | 'error';
const typeNames: Record<FieldType, string> = { short_text: 'Short text', long_text: 'Long text', email: 'Email', phone: 'Phone', number: 'Number', select: 'Choice', checkbox: 'Checkbox', date: 'Date' };

function QuestionEditor({ item, index, count, invalid, onChange, onMove, onRemove }: {
  item: FormField; index: number; count: number; invalid: boolean; onChange: (item: FormField) => void; onMove: (offset: number) => void; onRemove: () => void;
}) {
  const { t } = useTranslation('forms');
  const id = useId();
  return <li className={`space-y-3 rounded-md border bg-card p-3 ${invalid ? 'border-destructive' : ''}`} aria-label={t('Question {{number}}', { number: index + 1 })}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label className="sr-only" htmlFor={`${id}-type`}>{t('Answer type')}</label>
      <select id={`${id}-type`} className={`${field} w-44`} value={item.type} onChange={event => {
        const type = event.target.value as FieldType;
        onChange({ ...item, type, options: type === 'select' ? (item.options.length >= 2 ? item.options : ['Option 1', 'Option 2']) : [], min: null, max: null });
      }}>{fieldTypes.map(type => <option key={type} value={type}>{t(typeNames[type])}</option>)}</select>
      <div className="flex gap-1">
        <Button type="button" size="icon" variant="ghost" className="size-9" disabled={index === 0} onClick={() => onMove(-1)} aria-label={t('Move up')}><ArrowUp className="size-4" aria-hidden="true" /></Button>
        <Button type="button" size="icon" variant="ghost" className="size-9" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={t('Move down')}><ArrowDown className="size-4" aria-hidden="true" /></Button>
        <Button type="button" size="icon" variant="ghost" className="size-9" disabled={count === 1} onClick={onRemove} aria-label={t('Remove question')}><Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button>
      </div>
    </div>
    <div className="space-y-1"><label htmlFor={`${id}-label`} className="text-xs font-medium">{t('Question')}</label>
      <input id={`${id}-label`} className={field} value={item.label} maxLength={120} dir="auto" onChange={event => onChange({ ...item, label: event.target.value })} /></div>
    <div className="space-y-1"><label htmlFor={`${id}-help`} className="text-xs font-medium">{t('Help text (optional)')}</label>
      <input id={`${id}-help`} className={field} value={item.help} maxLength={200} dir="auto" onChange={event => onChange({ ...item, help: event.target.value })} /></div>
    {item.type === 'select' && <div className="space-y-1"><label htmlFor={`${id}-options`} className="text-xs font-medium">{t('Options, one per line')}</label>
      <textarea id={`${id}-options`} className={`${field} min-h-20 py-2`} dir="auto" value={item.options.join('\n')}
        onChange={event => onChange({ ...item, options: event.target.value.split('\n').map(option => option.trimStart()).slice(0, formLimits.maxOptions) })} /></div>}
    {item.type === 'number' && <div className="grid grid-cols-2 gap-2">
      {(['min', 'max'] as const).map(key => <div key={key} className="space-y-1"><label htmlFor={`${id}-${key}`} className="text-xs font-medium">{t(key === 'min' ? 'Minimum' : 'Maximum')}</label>
        <input id={`${id}-${key}`} type="number" className={field} value={item[key] ?? ''} onChange={event => onChange({ ...item, [key]: event.target.value === '' ? null : Number(event.target.value) })} /></div>)}
    </div>}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={item.required} onChange={event => onChange({ ...item, required: event.target.checked })} />{t('Required')}</label>
    {invalid && <p className="text-xs text-destructive">{t('Write the question; choice questions need at least two different options.')}</p>}
  </li>;
}

export default function FormEditor({ initial, origin }: { initial: FormRecord; origin: string }) {
  const { t } = useTranslation('forms');
  const router = useRouter();
  const id = useId();
  const [form, setForm] = useState(initial);
  const [draft, setDraft] = useState<FormContent>(initial.draft);
  const [slug, setSlug] = useState(initial.slug);
  const [tab, setTab] = useState<'questions' | 'style' | 'settings'>('questions');
  const [save, setSave] = useState<SaveState>('saved');
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const first = useRef(true);
  const version = useRef(0);
  const latest = useRef(draft);
  latest.current = draft;

  const persist = useCallback(async () => {
    if (!formContentSchema.safeParse(latest.current).success) { setSave('invalid'); return; }
    setSave('saving');
    const sentVersion = version.current;
    const result = await assetRequest(`/api/forms/${initial.id}`, 'PATCH', { draft: latest.current, title: latest.current.title.trim() });
    if (!result.ok) { setSave('error'); setMessage({ tone: 'error', text: t(result.error) }); return; }
    setForm(result.value.form);
    setSave(version.current === sentVersion ? 'saved' : 'pending');
  }, [initial.id, t]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    version.current++;
    setSave('pending');
    const timer = setTimeout(() => void persist(), 1000);
    return () => clearTimeout(timer);
  }, [draft, persist]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (save === 'pending' || save === 'saving') event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [save]);

  const setFields = (update: (fields: FormField[]) => FormField[]) => setDraft(previous => ({ ...previous, fields: update(previous.fields) }));
  const setTheme = (change: Partial<FormContent['theme']>) => setDraft(previous => ({ ...previous, theme: { ...previous.theme, ...change } }));

  async function call(path: string, body: unknown, success: string) {
    setBusy(true);
    setMessage(null);
    if (save !== 'saved') await persist();
    const result = await assetRequest(path, path.endsWith('/publish') ? 'POST' : 'PATCH', body);
    setBusy(false);
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
    setForm(result.value.form);
    setMessage({ tone: 'success', text: t(success) });
  }

  async function createQr() {
    setBusy(true);
    const result = await assetRequest(`/api/forms/${initial.id}/qr`, 'POST');
    setBusy(false);
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
    router.push(`/app?edit=${encodeURIComponent(result.value.qr_code_id)}`);
  }

  const invalid = new Set(draft.fields.filter(item => !formFieldSchema.safeParse(item).success).map(item => item.id));
  const saveText = { saved: 'All changes saved', pending: 'Unsaved changes', saving: 'Saving…', invalid: 'Complete the highlighted fields to save', error: 'Could not save. Retrying on the next change.' }[save];
  const locked = Boolean(form.published_at || form.qr_code_id);
  const text = (key: 'title' | 'submitLabel' | 'successMessage', label: string, max: number) => <div className="space-y-1">
    <label htmlFor={`${id}-${key}`} className="text-sm font-medium">{t(label)}</label>
    <input id={`${id}-${key}`} className={field} value={draft[key]} maxLength={max} dir="auto" aria-invalid={!draft[key].trim()} onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} /></div>;

  return <WorkspaceShell>
    <main className="space-y-5 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Link href="/forms" className="text-sm text-primary hover:underline">{t('All forms')}</Link>
          <h1 className="truncate text-2xl font-semibold tracking-tight" dir="auto">{draft.title || t('Untitled form')}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm"><LinkpageStatus page={form} />
            {!form.accepting_responses && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">{t('Closed')}</span>}
            <span role="status" className={save === 'invalid' || save === 'error' ? 'text-destructive' : 'text-muted-foreground'}>{t(saveText)}</span></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.is_published && <Button asChild variant="outline"><a href={`/f/${form.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="me-2 size-4" aria-hidden="true" />{t('View form')}</a></Button>}
          <Button asChild variant="outline"><Link href={`/forms/${form.id}/responses`}><Inbox className="me-2 size-4" aria-hidden="true" />{t('Answers')}</Link></Button>
          {form.is_published && <Button variant="outline" disabled={busy} onClick={() => void call(`/api/forms/${initial.id}/publish`, { publish: false }, 'Unpublished. The address now shows “page not found”.')}>{t('Unpublish')}</Button>}
          <Button disabled={busy || save === 'invalid'} onClick={() => void call(`/api/forms/${initial.id}/publish`, { publish: true }, 'Published. Your form is live.')}>
            {busy && <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />}{t(form.is_published ? 'Publish changes' : 'Publish')}</Button>
        </div>
      </div>
      {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${message.tone === 'error' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-emerald-500/40 bg-emerald-500/10'}`}>{message.text}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-4">
          <div role="tablist" aria-label={t('Editor sections')} className="flex gap-2 border-b">
            {([['questions', 'Questions'], ['style', 'Style'], ['settings', 'Settings']] as const).map(([key, label]) => <button key={key} role="tab" type="button" aria-selected={tab === key}
              onClick={() => setTab(key)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{t(label)}</button>)}
          </div>
          {tab === 'questions' && <section role="tabpanel" aria-label={t('Questions')} className="space-y-4">
            {text('title', 'Form title', 120)}
            <div className="space-y-1"><label htmlFor={`${id}-description`} className="text-sm font-medium">{t('Description')}</label>
              <textarea id={`${id}-description`} className={`${field} min-h-20 py-2`} value={draft.description} maxLength={600} dir="auto" onChange={event => setDraft(previous => ({ ...previous, description: event.target.value }))} /></div>
            <ul className="space-y-3">{draft.fields.map((item, index) => <QuestionEditor key={item.id} item={item} index={index} count={draft.fields.length} invalid={invalid.has(item.id)}
              onChange={next => setFields(fields => fields.map(old => old.id === item.id ? next : old))}
              onMove={offset => setFields(fields => { const copy = [...fields]; const [moved] = copy.splice(index, 1); copy.splice(index + offset, 0, moved); return copy; })}
              onRemove={() => setFields(fields => fields.filter(old => old.id !== item.id))} />)}</ul>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('Add question')}>
              {fieldTypes.map(type => <Button key={type} type="button" variant="outline" size="sm" disabled={draft.fields.length >= formLimits.maxFields}
                onClick={() => setFields(fields => [...fields, newField(type, '')])}>+ {t(typeNames[type])}</Button>)}
            </div>
          </section>}
          {tab === 'style' && <section role="tabpanel" aria-label={t('Style')} className="space-y-4">
            <LibraryLogoPicker title={t('Cover image')} selected={draft.coverAssetId} onSelect={assetId => setDraft(previous => ({ ...previous, coverAssetId: assetId }))} />
            <fieldset className="space-y-2"><legend className="text-sm font-medium">{t('Theme')}</legend>
              <div className="flex flex-wrap gap-2">{linkpageThemes.map(name => <label key={name} className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${draft.theme.preset === name ? 'ring-2 ring-primary' : ''}`}>
                <input type="radio" className="sr-only" name={`${id}-theme`} checked={draft.theme.preset === name} onChange={() => setTheme({ ...themePreset(name), buttonStyle: draft.theme.buttonStyle })} />
                {t(name[0].toUpperCase() + name.slice(1))}</label>)}</div></fieldset>
            <fieldset className="space-y-2"><legend className="text-sm font-medium">{t('Button shape')}</legend>
              <div className="flex flex-wrap gap-2">{buttonStyles.map(style => <label key={style} className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${draft.theme.buttonStyle === style ? 'ring-2 ring-primary' : ''}`}>
                <input type="radio" className="sr-only" name={`${id}-shape`} checked={draft.theme.buttonStyle === style} onChange={() => setTheme({ buttonStyle: style })} />{t(style[0].toUpperCase() + style.slice(1))}</label>)}</div></fieldset>
          </section>}
          {tab === 'settings' && <section role="tabpanel" aria-label={t('Settings')} className="space-y-5">
            {text('submitLabel', 'Submit button text', 40)}
            <div className="space-y-1"><label htmlFor={`${id}-success`} className="text-sm font-medium">{t('Message after sending')}</label>
              <textarea id={`${id}-success`} className={`${field} min-h-16 py-2`} value={draft.successMessage} maxLength={300} dir="auto" onChange={event => setDraft(previous => ({ ...previous, successMessage: event.target.value }))} /></div>
            <fieldset className="space-y-2 rounded-md border p-3"><legend className="px-1 text-sm font-medium">{t('Consent')}</legend>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={draft.consent.enabled} onChange={event => setDraft(previous => ({ ...previous, consent: { ...previous.consent, enabled: event.target.checked } }))} />
                {t('Ask people to accept a consent text before sending')}</label>
              {draft.consent.enabled && <><label htmlFor={`${id}-consent`} className="sr-only">{t('Consent text')}</label>
                <textarea id={`${id}-consent`} className={`${field} min-h-16 py-2`} value={draft.consent.text} maxLength={400} dir="auto" placeholder={t('Consent text')}
                  onChange={event => setDraft(previous => ({ ...previous, consent: { ...previous.consent, text: event.target.value } }))} /></>}
            </fieldset>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={form.accepting_responses} disabled={busy}
              onChange={event => void call(`/api/forms/${initial.id}`, { accepting_responses: event.target.checked }, event.target.checked ? 'The form accepts answers again.' : 'The form stopped accepting answers.')} />
              {t('Accept new answers')}</label>
            <div className="space-y-2">
              <label htmlFor={`${id}-slug`} className="text-sm font-medium">{t('Form address')}</label>
              <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted-foreground" dir="ltr">{origin}/f/</span>
                <input id={`${id}-slug`} className={`${field} max-w-xs`} dir="ltr" value={slug} disabled={locked} onChange={event => setSlug(event.target.value.toLowerCase())} />
                {!locked && <Button type="button" variant="outline" disabled={slug === form.slug} onClick={() => {
                  if (!validSlug(slug)) { setMessage({ tone: 'error', text: t('Use 3–40 lowercase letters, numbers or hyphens') }); return; }
                  void call(`/api/forms/${initial.id}`, { slug }, 'Address saved.');
                }}>{t('Save address')}</Button>}</div>
              <p className="text-xs text-muted-foreground">{t(locked ? 'The address is fixed after the first publication or QR code so shared links and printed QR codes keep working.' : 'You can change the address until you publish or create a QR code.')}</p>
            </div>
            <div className="space-y-2 rounded-md border p-4">
              <h2 className="text-base font-semibold">{t('QR code for this form')}</h2>
              <p className="text-sm text-muted-foreground">{t('The QR code opens {{url}}. Editing the form later never changes it.', { url: `${origin}/f/${form.slug}` })}</p>
              {form.qr_code_id ? <Button asChild variant="outline"><Link href={`/app?edit=${encodeURIComponent(form.qr_code_id)}`}><QrCode className="me-2 size-4" aria-hidden="true" />{t('Open QR code')}</Link></Button>
                : <Button type="button" onClick={() => void createQr()} disabled={busy}><QrCode className="me-2 size-4" aria-hidden="true" />{t('Create QR code')}</Button>}
            </div>
          </section>}
        </div>
        <aside aria-label={t('Preview')} className="lg:sticky lg:top-4 lg:self-start">
          <div className="h-[640px] overflow-y-auto rounded-xl border bg-white shadow-lg"><div inert><FormView content={draft} slug={null} /></div></div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t('Preview of the draft. People see the last published version.')}</p>
        </aside>
      </div>
    </main>
  </WorkspaceShell>;
}
