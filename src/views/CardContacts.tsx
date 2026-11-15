'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { assetRequest } from '@/lib/asset-client';
import type { CardContactRecord, CardSummary } from '@/lib/cards';

const field = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';

/** Contact manager: people who shared their details on the account's cards. */
export default function CardContacts({ contacts, cards, view }: { contacts: CardContactRecord[]; cards: CardSummary[]; view: { card: string; q: string } }) {
  const { t, i18n } = useTranslation('cards');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const dates = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
  const exportQuery = new URLSearchParams({ format: 'csv', ...(view.card ? { card: view.card } : {}), ...(view.q ? { q: view.q } : {}) });

  async function remove(contact: CardContactRecord) {
    if (!window.confirm(t('Delete the contact "{{name}}"? This cannot be undone.', { name: contact.name }))) return;
    const result = await assetRequest(`/api/cards/contacts/${contact.id}`, 'DELETE');
    if (!result.ok) { setError(t(result.error)); return; }
    router.refresh();
  }

  return <WorkspaceShell>
    <main className="space-y-5 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/cards" className="text-sm text-primary hover:underline">{t('All cards')}</Link>
          <h1 className="text-2xl font-semibold tracking-tight">{t('Contacts')}</h1>
          <p className="text-sm text-muted-foreground">{t('People who shared their details on your cards, with the consent text they accepted.')}</p>
        </div>
        <Button asChild variant="outline"><a href={`/api/cards/contacts?${exportQuery}`}><Download className="me-2 size-4" aria-hidden="true" />{t('Export CSV')}</a></Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <form action="/cards/contacts" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_14rem_auto]">
        <label htmlFor="cc-q" className="sr-only">{t('Search contacts')}</label>
        <input id="cc-q" name="q" type="search" defaultValue={view.q} placeholder={t('Search contacts')} className={field} dir="auto" />
        <label htmlFor="cc-card" className="sr-only">{t('Card')}</label>
        <select id="cc-card" name="card" defaultValue={view.card} className={field}><option value="">{t('All cards')}</option>
          {cards.map(card => <option key={card.id} value={card.id}>{card.title}</option>)}</select>
        <Button type="submit" variant="outline" className="min-h-11">{t('Search')}</Button>
      </form>
      {contacts.length === 0 ? <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{t('No contacts yet. Turn on contact exchange on a published card.')}</p>
        : <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-start"><tr>
              {['Name', 'Email', 'Phone', 'Company', 'Message', 'Card', 'Received'].map(header => <th key={header} scope="col" className="px-3 py-2 text-start font-medium">{t(header)}</th>)}
              <th scope="col" className="px-3 py-2"><span className="sr-only">{t('Actions')}</span></th></tr></thead>
            <tbody>{contacts.map(contact => <tr key={contact.id} className="border-t align-top">
              <td className="px-3 py-2 font-medium" dir="auto">{contact.name}</td>
              <td className="px-3 py-2" dir="ltr">{contact.email && <a className="text-primary hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a>}</td>
              <td className="px-3 py-2" dir="ltr">{contact.phone}</td>
              <td className="px-3 py-2" dir="auto">{contact.company}</td>
              <td className="max-w-xs px-3 py-2" dir="auto"><span className="line-clamp-3 whitespace-pre-line">{contact.message}</span></td>
              <td className="px-3 py-2" dir="auto">{contact.card_title}</td>
              <td className="whitespace-nowrap px-3 py-2">{dates.format(new Date(contact.created_at))}</td>
              <td className="px-3 py-2"><Button type="button" variant="ghost" size="icon" aria-label={t('Delete contact {{name}}', { name: contact.name })} onClick={() => void remove(contact)}>
                <Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button></td>
            </tr>)}</tbody>
          </table>
        </div>}
    </main>
  </WorkspaceShell>;
}
