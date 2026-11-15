import type { Metadata } from 'next';
import { requirePageSession } from '@/server/session';
import { listCards } from '@/server/cards';
import { getServerEnv } from '@/server/env';
import Cards from '@/views/Cards';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Cards', robots: { index: false } };

export default async function CardsPage() {
  const { user } = await requirePageSession('/cards');
  return <Cards cards={await listCards(user.id)} origin={getServerEnv().appUrl} />;
}
