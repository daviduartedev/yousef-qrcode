import type { Metadata } from 'next';
import { requirePageWorkspace } from '@/server/workspace-session';
import { listGenerations, listSources, usage } from '@/server/ai';
import { aiProvider } from '@/server/ai-provider';
import AssistedCreation from '@/views/AssistedCreation';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Assisted creation', robots: { index: false } };

export default async function AssistedCreationPage() {
  const { workspace } = await requirePageWorkspace('/ai', 'write');
  const [sources, generations, used] = await Promise.all([listSources(workspace.id), listGenerations(workspace.id), usage(workspace.id)]);
  return <AssistedCreation sources={sources} generations={generations} usage={used} available={aiProvider() !== null} />;
}
