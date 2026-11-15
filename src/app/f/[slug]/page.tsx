import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FormView } from '@/components/forms/FormView';
import { FormViewBeacon } from '@/components/forms/FormViewBeacon';
import { formSubmissionToken, publicForm } from '@/server/forms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const form = await publicForm((await params).slug);
  if (!form) return { title: 'Form not found', robots: { index: false } };
  return { title: { absolute: form.content.title }, description: form.content.description.slice(0, 160) || undefined, robots: { index: false } };
}

/** Public form; answers go only to the owner of the form. */
export default async function PublicForm({ params }: Params) {
  const form = await publicForm((await params).slug);
  if (!form) notFound();
  return <main className="min-h-screen" style={{ background: form.content.theme.background }}>
    <FormView content={form.content} slug={form.slug} closed={!form.accepting} token={formSubmissionToken(form.id)} />
    <p className="pb-6 text-center text-xs" style={{ color: form.content.theme.text, opacity: 0.6 }}><Link href="/" className="hover:underline">QRConnect</Link></p>
    <FormViewBeacon slug={form.slug} />
  </main>;
}
