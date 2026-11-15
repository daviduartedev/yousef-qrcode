'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { assetRequest } from '@/lib/asset-client';
import type { FormContent, FormRecord, FormResponseRecord } from '@/lib/forms';

type Data = { form: FormRecord; total: number; page: number; pageCount: number; stats: { views: number; submits: number }; responses: FormResponseRecord[] };

/** Answers of one form, newest first, with deletion and CSV export. Visible only to the owner. */
export default function FormResponses({ data }: { data: Data }) {
  const { t, i18n } = useTranslation('forms');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);
  const percent = new Intl.NumberFormat(i18n.resolvedLanguage, { style: 'percent', maximumFractionDigits: 1 });
  const dates = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
  const content = (data.form.published ?? data.form.draft) as FormContent;
  const columns = content.fields.map(field => ({ id: field.id, label: field.label }));
  for (const response of data.responses) for (const [key, label] of Object.entries(response.labels)) {
    const column = columns.find(item => item.id === key);
    if (!column) columns.push({ id: key, label: `${label} (${t('removed')})` });
    else if (column.label !== label && !column.label.endsWith(t('(edited)'))) column.label = `${column.label} ${t('(edited)')}`;
  }
  const show = (value: unknown) => value === null || value === undefined || value === '' ? '—' : typeof value === 'boolean' ? t(value ? 'Yes' : 'No') : String(value);

  async function remove(response: FormResponseRecord) {
    if (!window.confirm(t('Delete this answer? This cannot be undone.'))) return;
    const result = await assetRequest(`/api/forms/${data.form.id}/responses/${response.id}`, 'DELETE');
    if (!result.ok) { setError(t(result.error)); return; }
    router.refresh();
  }

  return <WorkspaceShell>
    <main className="space-y-5 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/forms/${data.form.id}`} className="text-sm text-primary hover:underline">{t('Back to editor')}</Link>
          <h1 className="text-2xl font-semibold tracking-tight" dir="auto">{t('Answers · {{title}}', { title: data.form.title })}</h1>
        </div>
        <Button asChild variant="outline"><a href={`/api/forms/${data.form.id}/responses?format=csv`}><Download className="me-2 size-4" aria-hidden="true" />{t('Export CSV')}</a></Button>
      </div>
      <dl className="grid gap-4 sm:grid-cols-3">
        {[['Answers', number.format(data.total)], ['Views in 30 days', number.format(data.stats.views)],
          ['Completion in 30 days', data.stats.views ? percent.format(Math.min(1, data.stats.submits / data.stats.views)) : '—']].map(([label, value]) =>
          <div key={label} className="rounded-md border bg-card p-4 shadow-sm"><dt className="text-sm text-muted-foreground">{t(label)}</dt><dd className="text-2xl font-semibold tabular-nums">{value}</dd></div>)}
      </dl>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {data.responses.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{t('No answers yet. Publish the form and share its link or QR code.')}</p>
        : <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60"><tr>
              <th scope="col" className="px-3 py-2 text-start font-medium">{t('Received')}</th>
              {columns.map(column => <th key={column.id} scope="col" className="px-3 py-2 text-start font-medium" dir="auto">{column.label}</th>)}
              <th scope="col" className="px-3 py-2"><span className="sr-only">{t('Actions')}</span></th></tr></thead>
            <tbody>{data.responses.map(response => <tr key={response.id} className="border-t align-top">
              <td className="whitespace-nowrap px-3 py-2">{dates.format(new Date(response.created_at))}</td>
              {columns.map(column => <td key={column.id} className="max-w-xs px-3 py-2" dir="auto"><span className="line-clamp-4 whitespace-pre-line">{show(response.answers[column.id])}</span></td>)}
              <td className="px-3 py-2"><Button type="button" variant="ghost" size="icon" aria-label={t('Delete answer')} onClick={() => void remove(response)}><Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button></td>
            </tr>)}</tbody>
          </table>
        </div>}
      {data.pageCount > 1 && <nav aria-label={t('Pages')} className="flex items-center justify-between text-sm">
        {data.page > 1 ? <Link className="text-primary hover:underline" href={`?page=${data.page - 1}`}>{t('Previous')}</Link> : <span />}
        <span>{t('Page {{page}} of {{count}}', { page: data.page, count: data.pageCount })}</span>
        {data.page < data.pageCount ? <Link className="text-primary hover:underline" href={`?page=${data.page + 1}`}>{t('Next')}</Link> : <span />}
      </nav>}
    </main>
  </WorkspaceShell>;
}
