import type { Metadata } from 'next';
import { requirePageWorkspace } from '@/server/workspace-session';
import { listIntegrations } from '@/server/integrations';
import Integrations from '@/views/Integrations';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Integrations', robots: { index: false } };

export default async function IntegrationsPage() {
  const { workspace } = await requirePageWorkspace('/integrations', 'manage');
  return <Integrations integrations={await listIntegrations(workspace.id)} />;
}
