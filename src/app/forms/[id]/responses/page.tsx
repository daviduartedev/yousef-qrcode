import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePageSession } from '@/server/session';
import { requestedPath } from '@/lib/auth-paths';
import { listFormResponses } from '@/server/forms';
import { HttpError } from '@/server/http';
import FormResponses from '@/views/FormResponses';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Form answers', robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function FormResponsesPage({ params, searchParams }: Props) {
  const { id } = await params;
  const raw = await searchParams;
  const { user } = await requirePageSession(requestedPath(`/forms/${encodeURIComponent(id)}/responses`, raw));
  const page = Number(typeof raw.page === 'string' ? raw.page : 1);
  const data = await listFormResponses(user.id, id, Number.isInteger(page) && page > 0 ? Math.min(page, 10000) : 1)
    .catch(error => { if (error instanceof HttpError && error.status === 404) return null; throw error; });
  if (!data) notFound();
  return <FormResponses data={data} />;
}
