import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CardView } from '@/components/cards/CardView';
import { CardViewBeacon } from '@/components/cards/CardViewBeacon';
import { publicCard } from '@/server/cards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const card = await publicCard((await params).slug);
  if (!card) return { title: 'Card not found', robots: { index: false } };
  const { firstName, lastName, title, company } = card.content.person;
  const name = [firstName, lastName].filter(Boolean).join(' ');
  return { title: { absolute: name }, description: [title, company].filter(Boolean).join(' · ') || undefined, openGraph: { title: name, type: 'profile' } };
}

/** Public digital business card; only the published copy is shown. */
export default async function PublicCard({ params }: Params) {
  const card = await publicCard((await params).slug);
  if (!card) notFound();
  return <main className="min-h-screen" style={{ background: card.content.theme.background }}>
    <CardView content={card.content} slug={card.slug} />
    <p className="pb-6 text-center text-xs" style={{ color: card.content.theme.text, opacity: 0.6 }}><Link href="/" className="hover:underline">QRConnect</Link></p>
    <CardViewBeacon slug={card.slug} />
  </main>;
}
