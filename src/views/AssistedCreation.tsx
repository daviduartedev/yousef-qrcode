'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { assetRequest } from '@/lib/asset-client';
import { aiLimits, type AiKind, type AiSourceRecord, type GenerationRecord } from '@/lib/ai';
import type { FormContent } from '@/lib/forms';
import type { LinkpageContent } from '@/lib/linkpages';

type Usage = { day: number; month: number; cost_micros: number; limits: { day: number; month: number } };
const field = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring';

function Preview({ item }: { item: GenerationRecord }) {
  const { t } = useTranslation('ai');
  if (!item.preview) return null;
  if (item.kind === 'linkpage') {
    const page = item.preview as LinkpageContent;
    return <div className="space-y-1 rounded-md border bg-background p-3 text-sm" dir="auto">
      <p className="font-medium">{page.profile.name}</p>
      {page.profile.bio && <p className="text-muted-foreground">{page.profile.bio}</p>}
      <ul className="list-disc ps-5">{page.blocks.map(block => <li key={block.id}>
        {block.type === 'separator' ? '—' : block.type === 'text' ? block.text : block.type === 'social' ? `${block.network}: ${block.url}`
          : `${block.label}: ${block.type === 'link' ? block.url : block.type === 'phone' ? block.phone : block.email}`}</li>)}</ul>
    </div>;
  }
  const form = item.preview as FormContent;
  return <div className="space-y-1 rounded-md border bg-background p-3 text-sm" dir="auto">
    <p className="font-medium">{form.title}</p>
    {form.description && <p className="text-muted-foreground">{form.description}</p>}
    <ul className="list-disc ps-5">{form.fields.map(item => <li key={item.id}>{item.label}{item.required ? ' *' : ''} <span className="text-xs text-muted-foreground" dir="ltr">({item.type}{item.options.length ? `: ${item.options.join(', ')}` : ''})</span></li>)}</ul>
    {form.consent.enabled && <p className="text-xs text-muted-foreground">{t('Consent text')}: {form.consent.text}</p>}
  </div>;
}

/** Assisted creation: sources, requests to the assistant and the human review queue. */
export default function AssistedCreation({ sources, generations, usage, available }: { sources: AiSourceRecord[]; generations: GenerationRecord[]; usage: Usage; available: boolean }) {
  const { t, i18n } = useTranslation('ai');
  const router = useRouter();
  const id = useId();
  const dates = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
  const money = new Intl.NumberFormat(i18n.resolvedLanguage, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 });
  const [kind, setKind] = useState<AiKind>('linkpage');
  const [prompt, setPrompt] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState({ title: '', content: '' });
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  async function run(path: string, method: 'POST' | 'DELETE', body: unknown, success: string, after?: () => void) {
    setMessage(null);
    const result = await assetRequest(path, method, body);
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return; }
    after?.();
    setMessage({ tone: 'success', text: t(success) });
    router.refresh();
  }
  const pending = generations.filter(item => item.status === 'pending_review');
  const history = generations.filter(item => item.status !== 'pending_review');
  const statusLabel: Record<GenerationRecord['status'], string> = { pending_review: 'Waiting for review', approved: 'Approved', rejected: 'Rejected', failed: 'Failed' };

  return <WorkspaceShell>
    <main className="space-y-8 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('Assisted creation')}</h1>
        <p className="text-sm text-muted-foreground">{t('The assistant writes a first draft of a Linkpage or form. Every draft waits for a person to review it, and approving only creates an unpublished draft you can still edit.')}</p>
      </div>
      {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${message.tone === 'error' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-emerald-500/40 bg-emerald-500/10'}`}>{message.text}</p>}
      {!available && <p role="status" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">{t('Assisted creation is not configured on this server yet. Sources and the review history stay available.')}</p>}

      <section aria-labelledby={`${id}-new`} className="space-y-4 rounded-md border bg-card p-4 shadow-sm">
        <h2 id={`${id}-new`} className="text-lg font-semibold">{t('New draft')}</h2>
        <p className="text-sm text-muted-foreground">{t('Used: {{day}} of {{dayLimit}} today, {{month}} of {{monthLimit}} this month · estimated cost this month {{cost}}', {
          day: usage.day, dayLimit: usage.limits.day, month: usage.month, monthLimit: usage.limits.month, cost: money.format(usage.cost_micros / 1_000_000) })}</p>
        <form className="space-y-3" onSubmit={async event => {
          event.preventDefault();
          setBusy(true);
          await run('/api/ai/generations', 'POST', { kind, prompt, source_ids: chosen }, 'Draft ready for review.', () => setPrompt(''));
          setBusy(false);
        }}>
          <fieldset><legend className="text-sm font-medium">{t('What to create')}</legend>
            <div className="mt-1 flex gap-4">{(['linkpage', 'form'] as const).map(value => <label key={value} className="flex items-center gap-2 text-sm">
              <input type="radio" name={`${id}-kind`} className="size-4" checked={kind === value} onChange={() => setKind(value)} />{value === 'linkpage' ? t('Linkpage') : t('Form')}</label>)}</div></fieldset>
          <div className="space-y-1"><label htmlFor={`${id}-prompt`} className="block text-sm font-medium">{t('Describe it')}</label>
            <textarea id={`${id}-prompt`} rows={4} maxLength={aiLimits.promptChars} dir="auto" className={field} value={prompt} onChange={event => setPrompt(event.target.value)}
              placeholder={t('For example: a page for our café with the menu link, Instagram and opening hours')} /></div>
          {sources.length > 0 && <fieldset><legend className="text-sm font-medium">{t('Sources to use (up to 5)')}</legend>
            <div className="mt-1 flex flex-wrap gap-3">{sources.map(item => <label key={item.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={chosen.includes(item.id)} disabled={!chosen.includes(item.id) && chosen.length >= aiLimits.sourcesPerGeneration}
                onChange={() => setChosen(list => list.includes(item.id) ? list.filter(value => value !== item.id) : [...list, item.id])} /><span dir="auto">{item.title}</span></label>)}</div></fieldset>}
          <Button type="submit" disabled={!available || busy || !prompt.trim()}><Sparkles className="me-1 size-4" aria-hidden="true" />{busy ? t('Writing the draft…') : t('Write draft')}</Button>
        </form>
      </section>

      <section aria-labelledby={`${id}-queue`} className="space-y-3">
        <h2 id={`${id}-queue`} className="text-lg font-semibold">{t('Review queue')}</h2>
        {pending.length === 0 ? <p className="text-sm text-muted-foreground">{t('Nothing waiting for review.')}</p>
          : <ul className="space-y-3">{pending.map(item => <li key={item.id} className="space-y-2 rounded-md border bg-card p-3 text-sm">
            <p><span className="font-medium">{item.kind === 'linkpage' ? t('Linkpage') : t('Form')}</span> · <span dir="auto">{item.prompt}</span></p>
            <Preview item={item} />
            {item.dropped > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">{t('{{count}} invalid items were left out.', { count: item.dropped })}</p>}
            <p className="text-xs text-muted-foreground">{t('Review links, contacts and facts before approving: the assistant can make mistakes.')}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void run(`/api/ai/generations/${item.id}`, 'POST', { decision: 'approve' }, 'Draft approved. It was saved unpublished.')}>{t('Approve and create draft')}</Button>
              <Button size="sm" variant="outline" onClick={() => void run(`/api/ai/generations/${item.id}`, 'POST', { decision: 'reject' }, 'Draft rejected.')}>{t('Reject')}</Button>
            </div>
          </li>)}</ul>}
      </section>

      <section aria-labelledby={`${id}-sources`} className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
        <h2 id={`${id}-sources`} className="text-lg font-semibold">{t('Sources')}</h2>
        <p className="text-sm text-muted-foreground">{t('Text the assistant may take facts from, such as a menu or event details. Sources stay in this workspace and are sent to the AI provider only when you choose them for a draft.')}</p>
        <form className="space-y-2" onSubmit={event => { event.preventDefault(); void run('/api/ai/sources', 'POST', source, 'Source saved.', () => setSource({ title: '', content: '' })); }}>
          <div className="space-y-1"><label htmlFor={`${id}-stitle`} className="block text-sm font-medium">{t('Source title')}</label>
            <input id={`${id}-stitle`} maxLength={80} dir="auto" className={`${field} max-w-sm`} value={source.title} onChange={event => setSource({ ...source, title: event.target.value })} /></div>
          <div className="space-y-1"><label htmlFor={`${id}-stext`} className="block text-sm font-medium">{t('Source text')}</label>
            <textarea id={`${id}-stext`} rows={4} maxLength={aiLimits.sourceChars} dir="auto" className={field} value={source.content} onChange={event => setSource({ ...source, content: event.target.value })} /></div>
          <Button type="submit" variant="outline" disabled={!source.title.trim() || !source.content.trim()}>{t('Save source')}</Button>
        </form>
        {sources.length > 0 && <ul className="divide-y text-sm">{sources.map(item => <li key={item.id} className="flex items-center justify-between gap-2 py-2">
          <span><span dir="auto">{item.title}</span> <span className="text-xs text-muted-foreground">· {t('{{count}} characters', { count: item.characters })}</span></span>
          <Button size="sm" variant="ghost" aria-label={t('Delete source {{title}}', { title: item.title })} onClick={() => void run(`/api/ai/sources/${item.id}`, 'DELETE', undefined, 'Source deleted.')}><Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button>
        </li>)}</ul>}
      </section>

      <section aria-labelledby={`${id}-history`} className="space-y-3">
        <h2 id={`${id}-history`} className="text-lg font-semibold">{t('History')}</h2>
        {history.length === 0 ? <p className="text-sm text-muted-foreground">{t('No drafts yet.')}</p>
          : <table className="w-full text-sm"><thead><tr className="text-xs text-muted-foreground">
              {['Created', 'Type', 'Status', 'Estimated cost'].map(header => <th key={header} scope="col" className="py-1 text-start font-medium">{t(header)}</th>)}
              <th scope="col"><span className="sr-only">{t('Actions')}</span></th></tr></thead>
            <tbody>{history.map(item => <tr key={item.id} className="border-t">
              <td className="py-1">{dates.format(new Date(item.created_at))}</td><td>{item.kind === 'linkpage' ? t('Linkpage') : t('Form')}</td>
              <td>{t(statusLabel[item.status])}{item.error ? ` · ${t(item.error)}` : ''}</td><td>{money.format(item.cost_micros / 1_000_000)}</td>
              <td className="text-end">{item.target_id && <Link className="underline" href={`/${item.kind === 'linkpage' ? 'linkpages' : 'forms'}/${item.target_id}`}>{t('Open draft')}</Link>}</td>
            </tr>)}</tbody></table>}
      </section>
    </main>
  </WorkspaceShell>;
}
