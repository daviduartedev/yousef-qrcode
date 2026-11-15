import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePageWorkspace } from '@/server/workspace-session';
import { getCard } from '@/server/cards';
import { getServerEnv } from '@/server/env';
import { HttpError } from '@/server/http';
import CardEditor from '@/views/CardEditor';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Edit card', robots: { index: false } };

export default async function CardEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { workspace } = await requirePageWorkspace(`/cards/${encodeURIComponent(id)}`);
  const card = await getCard(workspace.id, id).catch(error => { if (error instanceof HttpError && error.status === 404) return null; throw error; });
  if (!card) notFound();
  return <CardEditor initial={card} origin={getServerEnv().appUrl} />;
}
