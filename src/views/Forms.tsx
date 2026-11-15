'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Inbox, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { FormView } from '@/components/forms/FormView';
import { LinkpageStatus } from '@/views/Linkpages';
import { formTemplates, type FormSummary } from '@/lib/forms';
import { assetRequest } from '@/lib/asset-client';

export default function Forms({ forms, origin }: { forms: FormSummary[]; origin: string }) {
  const { t, i18n } = useTranslation('forms');
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef(new Map<string, string>());
  // Stable field ids keep server and browser renders identical.
  const previews = useRef(Object.fromEntries(formTemplates.map(item => {
    const content = item.content();
    return [item.id, { ...content, fields: content.fields.map((field, index) => ({ ...field, id: `preview${String(index).padStart(3, '0')}` })) }];
  })));
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);

  async function create(template: string) {
    setError(null);
    setCreating(template);
    let key = keys.current.get(template);
    if (!key) { key = crypto.randomUUID(); keys.current.set(template, key); }
    const result = await assetRequest('/api/forms', 'POST', { template, creation_key: key });
    setCreating(null);
    if (!result.ok) { setError(t(result.error)); return; }
    keys.current.delete(template);
    router.push(`/forms/${result.value.form.id}`);
  }

  async function remove(form: FormSummary) {
    if (!window.confirm(t('Delete "{{title}}"? Its answers are deleted and its QR code stops working.', { title: form.title }))) return;
    const result = await assetRequest(`/api/forms/${form.id}`, 'DELETE');
    if (!result.ok) { setError(t(result.error)); return; }
    router.refresh();
  }

  return <WorkspaceShell>
    <main className="space-y-8 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('Forms')}</h1>
        <p className="text-sm text-muted-foreground">{t('Collect answers from anyone with a link or QR code; no account needed to reply.')}</p>
      </div>
      {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <section aria-labelledby="forms-list" className="space-y-3">
        <h2 id="forms-list" className="text-lg font-semibold">{t('Your forms')}</h2>
        {forms.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{t('No forms yet. Choose a template below to create your first form.')}</p>
          : <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {forms.map(form => <li key={form.id} className="flex flex-col gap-3 rounded-md border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 truncate font-semibold" dir="auto">{form.title}</h3><LinkpageStatus page={form} /></div>
              <p className="truncate text-sm text-muted-foreground" dir="ltr">{origin}/f/{form.slug}</p>
              <p className="text-sm">{t('{{responses}} answers · {{views}} views in 30 days', { responses: number.format(form.responses_total), views: number.format(form.views_30d) })}
                {!form.accepting_responses && <> · <span className="text-amber-700">{t('Closed')}</span></>}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button asChild size="sm"><Link href={`/forms/${form.id}`}><Pencil className="me-1 size-4" aria-hidden="true" />{t('Edit')}</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href={`/forms/${form.id}/responses`}><Inbox className="me-1 size-4" aria-hidden="true" />{t('Answers')}</Link></Button>
                {form.is_published && <Button asChild size="sm" variant="outline"><a href={`/f/${form.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="me-1 size-4" aria-hidden="true" />{t('Open')}</a></Button>}
                <Button size="sm" variant="ghost" onClick={() => void remove(form)} aria-label={t('Delete {{title}}', { title: form.title })}><Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button>
              </div>
            </li>)}
          </ul>}
      </section>
      <section aria-labelledby="forms-templates" className="space-y-4">
        <h2 id="forms-templates" className="text-lg font-semibold">{t('Start from a template')}</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {formTemplates.map(template => <li key={template.id} className="flex flex-col overflow-hidden rounded-md border bg-card shadow-sm">
            <div className="pointer-events-none h-64 overflow-hidden border-b" aria-hidden="true"><div inert className="origin-top scale-[0.6]" style={{ width: '166%', marginInlineStart: '-33%' }}>
              <FormView content={previews.current[template.id]} slug={null} /></div></div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="font-semibold">{t(template.name)}</h3>
              <p className="text-sm text-muted-foreground">{t(template.description)}</p>
              <Button className="mt-auto" onClick={() => void create(template.id)} disabled={creating !== null}>
                {creating === template.id && <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />}{t('Use {{name}}', { name: t(template.name) })}</Button>
            </div>
          </li>)}
        </ul>
      </section>
    </main>
  </WorkspaceShell>;
}
