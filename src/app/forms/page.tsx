import type { Metadata } from 'next';
import { requirePageSession } from '@/server/session';
import { listForms } from '@/server/forms';
import { getServerEnv } from '@/server/env';
import Forms from '@/views/Forms';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Forms', robots: { index: false } };

export default async function FormsPage() {
  const { user } = await requirePageSession('/forms');
  return <Forms forms={await listForms(user.id)} origin={getServerEnv().appUrl} />;
}
