import type { Metadata } from 'next';
import { requirePageWorkspace } from '@/server/workspace-session';
import { listForms } from '@/server/forms';
import { getServerEnv } from '@/server/env';
import Forms from '@/views/Forms';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Forms', robots: { index: false } };

export default async function FormsPage() {
  const { workspace } = await requirePageWorkspace('/forms');
  return <Forms forms={await listForms(workspace.id)} origin={getServerEnv().appUrl} />;
}
