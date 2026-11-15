'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, ExternalLink, Loader2, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { CardView } from '@/components/cards/CardView';
import { LinkpageStatus } from '@/views/Linkpages';
import { themePreset } from '@/lib/linkpages';
import { blankCard, cardTemplates, type CardSummary } from '@/lib/cards';
import { assetRequest } from '@/lib/asset-client';

const sample = (theme: (typeof cardTemplates)[number]['theme']) => ({
  ...blankCard('Sara'), theme: themePreset(theme),
  person: { ...blankCard('Sara').person, lastName: 'Haddad', title: 'Sales Director', company: 'Example Co.' },
  contact: { phones: [{ label: 'mobile' as const, number: '+1 555 0100' }], emails: [{ label: 'work' as const, address: 'sara@example.com' }], website: '', address: '' },
  exchange: { enabled: false, purpose: '' },
});

export default function Cards({ cards, origin }: { cards: CardSummary[]; origin: string }) {
  const { t, i18n } = useTranslation('cards');
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const keys = useRef(new Map<string, string>());
  const number = new Intl.NumberFormat(i18n.resolvedLanguage);

  async function create(template: string) {
    setError(null);
    setCreating(template);
    let key = keys.current.get(template);
    if (!key) { key = crypto.randomUUID(); keys.current.set(template, key); }
    const result = await assetRequest('/api/cards', 'POST', { template, creation_key: key });
    setCreating(null);
    if (!result.ok) { setError(t(result.error)); return; }
    keys.current.delete(template);
    router.push(`/cards/${result.value.card.id}`);
  }

  async function remove(card: CardSummary) {
    if (!window.confirm(t('Delete "{{title}}"? Its contacts and statistics are deleted and its QR code stops working.', { title: card.title }))) return;
    const result = await assetRequest(`/api/cards/${card.id}`, 'DELETE');
    if (!result.ok) { setError(t(result.error)); return; }
    router.refresh();
  }

  return <WorkspaceShell>
    <main className="space-y-8 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('Digital business cards')}</h1>
          <p className="text-sm text-muted-foreground">{t('Share your contact details with a link or QR code; visitors can save you to their phone.')}</p>
        </div>
        <Button asChild variant="outline"><Link href="/cards/contacts"><Users className="me-2 size-4" aria-hidden="true" />{t('Contacts')}</Link></Button>
      </div>
      {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <section aria-labelledby="cards-list" className="space-y-3">
        <h2 id="cards-list" className="text-lg font-semibold">{t('Your cards')}</h2>
        {cards.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{t('No cards yet. Pick a style below to create your first card.')}</p>
          : <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(card => <li key={card.id} className="flex flex-col gap-3 rounded-md border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 truncate font-semibold" dir="auto">{card.title}</h3><LinkpageStatus page={card} /></div>
              <p className="truncate text-sm text-muted-foreground" dir="ltr">{origin}/c/{card.slug}</p>
              <p className="text-sm">{t('{{views}} views · {{saves}} saves in 30 days · {{contacts}} contacts', { views: number.format(card.views_30d), saves: number.format(card.saves_30d), contacts: number.format(card.contacts_total) })}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button asChild size="sm"><Link href={`/cards/${card.id}`}><Pencil className="me-1 size-4" aria-hidden="true" />{t('Edit')}</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href={`/cards/${card.id}/analytics`}><BarChart3 className="me-1 size-4" aria-hidden="true" />{t('Analytics')}</Link></Button>
                {card.is_published && <Button asChild size="sm" variant="outline"><a href={`/c/${card.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="me-1 size-4" aria-hidden="true" />{t('Open')}</a></Button>}
                <Button size="sm" variant="ghost" onClick={() => void remove(card)} aria-label={t('Delete {{title}}', { title: card.title })}><Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button>
              </div>
            </li>)}
          </ul>}
      </section>
      <section aria-labelledby="cards-templates" className="space-y-4">
        <h2 id="cards-templates" className="text-lg font-semibold">{t('Create a card')}</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {cardTemplates.map(template => <li key={template.id} className="flex flex-col overflow-hidden rounded-md border bg-card shadow-sm">
            <div className="pointer-events-none h-64 overflow-hidden border-b" aria-hidden="true" inert>
              <div className="origin-top scale-[0.6]" style={{ width: '166%', marginInlineStart: '-33%' }}><CardView content={sample(template.theme)} slug={null} /></div>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="font-semibold">{t(template.name)}</h3>
              <Button className="mt-auto" onClick={() => void create(template.id)} disabled={creating !== null}>
                {creating === template.id && <Loader2 className="me-2 size-4 animate-spin" aria-hidden="true" />}{t('Use {{name}}', { name: t(template.name) })}
              </Button>
            </div>
          </li>)}
        </ul>
      </section>
    </main>
  </WorkspaceShell>;
}
