import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePageSession } from '@/server/session';
import { getForm } from '@/server/forms';
import { getServerEnv } from '@/server/env';
import { HttpError } from '@/server/http';
import FormEditor from '@/views/FormEditor';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Edit form', robots: { index: false } };

export default async function FormEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requirePageSession(`/forms/${encodeURIComponent(id)}`);
  const form = await getForm(user.id, id).catch(error => { if (error instanceof HttpError && error.status === 404) return null; throw error; });
  if (!form) notFound();
  return <FormEditor initial={form} origin={getServerEnv().appUrl} />;
}
