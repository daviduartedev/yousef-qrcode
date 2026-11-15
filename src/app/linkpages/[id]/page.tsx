import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePageSession } from '@/server/session';
import { getLinkpage } from '@/server/linkpages';
import { getServerEnv } from '@/server/env';
import { HttpError } from '@/server/http';
import LinkpageEditor from '@/views/LinkpageEditor';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Edit Linkpage', robots: { index: false } };

export default async function LinkpageEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requirePageSession(`/linkpages/${encodeURIComponent(id)}`);
  const page = await getLinkpage(user.id, id).catch(error => { if (error instanceof HttpError && error.status === 404) return null; throw error; });
  if (!page) notFound();
  return <LinkpageEditor initial={page} origin={getServerEnv().appUrl} />;
}
