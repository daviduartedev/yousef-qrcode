import { requirePageWorkspace } from '@/server/workspace-session';
import { getQROverview } from '@/server/analytics';
import Overview from '@/views/Overview';

export const runtime = 'nodejs';

export default async function OverviewPage() {
  const { workspace } = await requirePageWorkspace('/overview');
  return <Overview data={await getQROverview(workspace.id)} />;
}
