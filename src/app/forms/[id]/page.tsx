import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePageWorkspace } from '@/server/workspace-session';
import { getForm } from '@/server/forms';
import { getServerEnv } from '@/server/env';
import { HttpError } from '@/server/http';
import FormEditor from '@/views/FormEditor';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Edit form', robots: { index: false } };

export default async function FormEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { workspace } = await requirePageWorkspace(`/forms/${encodeURIComponent(id)}`, 'write');
  const form = await getForm(workspace.id, id).catch(error => { if (error instanceof HttpError && error.status === 404) return null; throw error; });
  if (!form) notFound();
  return <FormEditor initial={form} origin={getServerEnv().appUrl} />;
}
