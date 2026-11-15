import type { Metadata } from 'next';
import { requirePageWorkspace } from '@/server/workspace-session';
import { listCards } from '@/server/cards';
import { getServerEnv } from '@/server/env';
import Cards from '@/views/Cards';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Cards', robots: { index: false } };

export default async function CardsPage() {
  const { workspace } = await requirePageWorkspace('/cards');
  return <Cards cards={await listCards(workspace.id)} origin={getServerEnv().appUrl} />;
}
