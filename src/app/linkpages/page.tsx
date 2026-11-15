import type { Metadata } from 'next';
import { requirePageSession } from '@/server/session';
import { listLinkpages } from '@/server/linkpages';
import { getServerEnv } from '@/server/env';
import Linkpages from '@/views/Linkpages';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Linkpages', robots: { index: false } };

export default async function LinkpagesPage() {
  const { user } = await requirePageSession('/linkpages');
  return <Linkpages pages={await listLinkpages(user.id)} origin={getServerEnv().appUrl} />;
}
