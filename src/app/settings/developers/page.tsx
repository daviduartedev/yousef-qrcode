import type { Metadata } from 'next';
import { requirePageWorkspace } from '@/server/workspace-session';
import { listKeys } from '@/server/api-keys';
import { listWebhooks } from '@/server/webhooks';
import { getServerEnv } from '@/server/env';
import Developers from '@/views/Developers';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'API and webhooks', robots: { index: false } };

export default async function DevelopersPage() {
  const { workspace } = await requirePageWorkspace('/settings/developers', 'manage');
  const [keys, hooks] = await Promise.all([listKeys(workspace.id), listWebhooks(workspace.id)]);
  return <Developers keys={keys} hooks={hooks} origin={getServerEnv().appUrl} />;
}
