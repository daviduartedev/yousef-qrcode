import type { Metadata } from 'next';
import { requirePageWorkspace } from '@/server/workspace-session';
import { listMembers, listWorkspaces } from '@/server/workspaces';
import Organization from '@/views/Organization';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Organization', robots: { index: false } };

export default async function OrganizationPage() {
  const { workspace } = await requirePageWorkspace('/settings/organization');
  const [workspaces, people] = await Promise.all([
    listWorkspaces(workspace.userId),
    workspace.kind === 'organization' ? listMembers(workspace) : { members: [], invitations: [] },
  ]);
  return <Organization active={workspace} workspaces={workspaces} members={people.members} invitations={people.invitations} />;
}
