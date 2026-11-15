import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LinkpageView } from '@/components/linkpages/LinkpageView';
import { ViewBeacon } from '@/components/linkpages/ViewBeacon';
import { publicLinkpage } from '@/server/linkpages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await publicLinkpage((await params).slug);
  if (!page) return { title: 'Page not found', robots: { index: false } };
  const title = page.content.profile.name || 'Linkpage';
  return { title: { absolute: title }, description: page.content.profile.bio.slice(0, 160) || undefined, openGraph: { title, type: 'profile' } };
}

/** Public, sessionless Linkpage. Only the published copy is ever shown; drafts stay private. */
export default async function PublicLinkpage({ params }: Params) {
  const page = await publicLinkpage((await params).slug);
  if (!page) notFound();
  const base = `/p/${page.slug}`;
  return (
    <main className="min-h-screen" style={{ background: page.content.theme.background }}>
      <LinkpageView content={page.content}
        href={block => block.type === 'separator' || block.type === 'text' ? null : `${base}/go/${block.id}`}
        media={assetId => `${base}/media/${assetId}`} />
      <p className="pb-6 text-center text-xs" style={{ color: page.content.theme.text, opacity: 0.6 }}>
        <Link href="/" className="hover:underline">QRConnect</Link>
      </p>
      <ViewBeacon slug={page.slug} />
    </main>
  );
}
