import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePageSession } from '@/server/session';
import { requestedPath } from '@/lib/auth-paths';
import { linkpageAnalytics } from '@/server/linkpage-analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';
import { HttpError } from '@/server/http';
import LinkpageAnalytics from '@/views/LinkpageAnalytics';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Linkpage analytics', robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LinkpageAnalyticsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const raw = await searchParams;
  const { user } = await requirePageSession(requestedPath(`/linkpages/${encodeURIComponent(id)}/analytics`, raw));
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === 'string') query.set(key, value);
  const today = new Date().toISOString().slice(0, 10);
  const data = await linkpageAnalytics(user.id, id, readAnalyticsQuery(query, today)).catch(error => { if (error instanceof HttpError && error.status === 404) return null; throw error; });
  if (!data) notFound();
  return <LinkpageAnalytics data={data} today={today} />;
}
