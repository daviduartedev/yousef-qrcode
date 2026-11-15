import type { Metadata } from 'next';
import { requirePageWorkspace } from '@/server/workspace-session';
import { listDomains } from '@/server/domains';
import { getServerEnv } from '@/server/env';
import { can } from '@/lib/workspaces';
import Domains from '@/views/Domains';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Custom domains', robots: { index: false } };

export default async function DomainsPage() {
  const { workspace } = await requirePageWorkspace('/settings/domains');
  return <Domains domains={await listDomains(workspace.id, can(workspace.role, 'manage'))} canManage={can(workspace.role, 'manage')} appHost={new URL(getServerEnv().appUrl).host} />;
}
