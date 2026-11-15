import { requirePageSession } from '@/server/session';
import { getQROverview } from '@/server/analytics';
import Overview from '@/views/Overview';

export const runtime = 'nodejs';

export default async function OverviewPage() {
  const { user } = await requirePageSession('/overview');
  return <Overview data={await getQROverview(user.id)} />;
}
