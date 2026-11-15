import type { Metadata } from 'next';
import { requirePageWorkspace } from '@/server/workspace-session';
import { listLinkpages } from '@/server/linkpages';
import { getServerEnv } from '@/server/env';
import Linkpages from '@/views/Linkpages';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Linkpages', robots: { index: false } };

export default async function LinkpagesPage() {
  const { workspace } = await requirePageWorkspace('/linkpages');
  return <Linkpages pages={await listLinkpages(workspace.id)} origin={getServerEnv().appUrl} />;
}
