import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePageWorkspace } from '@/server/workspace-session';
import { requestedPath } from '@/lib/auth-paths';
import { cardAnalytics } from '@/server/card-analytics';
import { readAnalyticsQuery } from '@/lib/qr-analytics';
import { HttpError } from '@/server/http';
import CardAnalytics from '@/views/CardAnalytics';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Card analytics', robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CardAnalyticsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const raw = await searchParams;
  const { workspace } = await requirePageWorkspace(requestedPath(`/cards/${encodeURIComponent(id)}/analytics`, raw));
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === 'string') query.set(key, value);
  const today = new Date().toISOString().slice(0, 10);
  const data = await cardAnalytics(workspace.id, id, readAnalyticsQuery(query, today)).catch(error => { if (error instanceof HttpError && error.status === 404) return null; throw error; });
  if (!data) notFound();
  return <CardAnalytics data={data} today={today} />;
}
