'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, ExternalLink, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { LinkpageView } from '@/components/linkpages/LinkpageView';
import { linkpageTemplates, templateCategories, type LinkpageSummary } from '@/lib/linkpages';
import { assetRequest } from '@/lib/asset-client';

export function LinkpageStatus({ page }: { page: Pick<LinkpageSummary, 'is_published' | 'has_unpublished_changes' | 'published_at'> }) {
  const { t } = useTranslation('linkpages');
  const [label, tone] = page.is_published
    ? page.has_unpublished_changes ? ['Published · unpublished changes', 'bg-amber-100 text-amber-900'] : ['Published', 'bg-emerald-100 text-emerald-900']
    : page.published_at ? ['Unpublished', 'bg-slate-200 text-slate-800'] : ['Draft', 'bg-slate-200 text-slate-800'];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{t(label)}</span>;
}

export default function Linkpages({ pages, origin }: { pages: LinkpageSummary[]; origin: string }) {
  const { t, i18n } = useTranslation('linkpages');
  const router = useRouter();
  const [category, setCategory] = useState<(typeof templateCategories)[number] | 'all'>('all');
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef(new Map<string, string>());
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);
  const previews = useRef(Object.fromEntries(linkpageTemplates.map(item => [item.id, item.content()])));

  async function create(template: string) {
    setError(null);
    setCreating(template);
    // The same key is reused if the request is retried, so the server never makes two drafts for one click.
    let key = keys.current.get(template);
    if (!key) { key = crypto.randomUUID(); keys.current.set(template, key); }
    const result = await assetRequest('/api/linkpages', 'POST', { template, creation_key: key });
    setCreating(null);
    if (!result.ok) { setError(t(result.error)); return; }
    keys.current.delete(template);
    router.push(`/linkpages/${result.value.linkpage.id}`);
  }

  async function remove(page: LinkpageSummary) {
    const message = page.is_published
      ? t('Delete "{{title}}"? Its public address stops working and printed QR codes will show an error page.', { title: page.title })
      : t('Delete "{{title}}"? This cannot be undone.', { title: page.title });
    if (!window.confirm(message)) return;
    const result = await assetRequest(`/api/linkpages/${page.id}`, 'DELETE');
    if (!result.ok) { setError(t(result.error)); return; }
    router.refresh();
  }

  const templates = linkpageTemplates.filter(item => category === 'all' || item.category === category);
  return <WorkspaceShell>
    <main className="space-y-8 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('Linkpages')}</h1>
          <p className="text-sm text-muted-foreground">{t('One mobile page with all your links, ready to share with a QR code.')}</p>
        </div>
        <Button asChild><a href="#templates"><Plus className="me-2 size-4" aria-hidden="true" />{t('New Linkpage')}</a></Button>
      </div>
      {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <section aria-labelledby="linkpages-list" className="space-y-3">
        <h2 id="linkpages-list" className="text-lg font-semibold">{t('Your Linkpages')}</h2>
        {pages.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{t('No Linkpages yet. Choose a template below to create your first one.')}</p>
          : <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pages.map(page => <li key={page.id} className="flex flex-col gap-3 rounded-md border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate font-semibold" dir="auto">{page.title}</h3>
                  <LinkpageStatus page={page} />
                </div>
                <p className="truncate text-sm text-muted-foreground" dir="ltr">{origin}/p/{page.slug}</p>
                <p className="text-sm">{t('{{views}} views · {{clicks}} clicks in 30 days', { views: number.format(page.views_30d), clicks: number.format(page.clicks_30d) })}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button asChild size="sm"><Link href={`/linkpages/${page.id}`}><Pencil className="me-1 size-4" aria-hidden="true" />{t('Edit')}</Link></Button>
                  <Button asChild size="sm" variant="outline"><Link href={`/linkpages/${page.id}/analytics`}><BarChart3 className="me-1 size-4" aria-hidden="true" />{t('Analytics')}</Link></Button>
                  {page.is_published && <Button asChild size="sm" variant="outline"><a href={`/p/${page.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="me-1 size-4" aria-hidden="true" />{t('Open')}</a></Button>}
                  <Button size="sm" variant="ghost" onClick={() => void remove(page)} aria-label={t('Delete {{title}}', { title: page.title })}><Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button>
                </div>
              </li>)}
            </ul>}
      </section>

      <section id="templates" aria-labelledby="linkpages-templates" className="scroll-mt-20 space-y-4">
        <h2 id="linkpages-templates" className="text-lg font-semibold">{t('Start from a template')}</h2>
        <div role="tablist" aria-label={t('Template categories')} className="flex flex-wrap gap-2">
          {(['all', ...templateCategories] as const).map(item => <button key={item} role="tab" aria-selected={category === item} type="button"
            onClick={() => setCategory(item)} className={`rounded-full border px-3 py-1.5 text-sm ${category === item ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            {t(item === 'all' ? 'All' : item === 'blank' ? 'Blank' : item === 'personal' ? 'Personal' : item === 'business' ? 'Business' : item === 'restaurant' ? 'Restaurant' : 'Events')}
          </button>)}
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {templates.map(template => <li key={template.id} className="flex flex-col overflow-hidden rounded-md border bg-card shadow-sm">
            <div className="pointer-events-none h-64 overflow-hidden border-b" aria-hidden="true">
              <div className="origin-top scale-[0.6]" style={{ width: '166%', marginInlineStart: '-33%' }}>
                <LinkpageView content={previews.current[template.id]} href={() => null} media={() => null} />
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="font-semibold">{t(template.name)}</h3>
              <p className="text-sm text-muted-foreground">{t(template.description)}</p>
              <Button className="mt-auto" onClick={() => void create(template.id)} disabled={creating !== null}>
                {creating === template.id && <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />}
                {t('Use {{name}}', { name: t(template.name) })}
              </Button>
            </div>
          </li>)}
        </ul>
      </section>
    </main>
  </WorkspaceShell>;
}
