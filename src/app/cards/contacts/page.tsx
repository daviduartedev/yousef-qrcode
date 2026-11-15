import type { Metadata } from 'next';
import { requirePageSession } from '@/server/session';
import { requestedPath } from '@/lib/auth-paths';
import { listCardContacts, listCards } from '@/server/cards';
import CardContacts from '@/views/CardContacts';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Card contacts', robots: { index: false } };

export default async function CardContactsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const { user } = await requirePageSession(requestedPath('/cards/contacts', raw));
  const view = { card: typeof raw.card === 'string' ? raw.card : '', q: typeof raw.q === 'string' ? raw.q.trim().slice(0, 120) : '' };
  const [contacts, cards] = await Promise.all([listCardContacts(user.id, { card: view.card || null, q: view.q }), listCards(user.id)]);
  return <CardContacts contacts={contacts} cards={cards} view={view} />;
}
