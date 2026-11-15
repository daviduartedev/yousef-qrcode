import { requirePageWorkspace } from '@/server/workspace-session';
import { requestedPath } from '@/lib/auth-paths';
import { redirect } from 'next/navigation';
import { qrListHref, readQRListQuery } from '@/lib/qr-list';
import { listCodePage } from '@/server/qr-codes';
import { listOrganization } from '@/server/qr-organization';
import { getServerEnv } from '@/server/env';
import MyQRCodes from '@/views/MyQRCodes';
export const runtime = 'nodejs';
export default async function MyCodes({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const { workspace } = await requirePageWorkspace(requestedPath('/my-qrcodes', raw));
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') params.set(key, value);
  }
  const query = readQRListQuery(params);
  const [result, organization] = await Promise.all([listCodePage(workspace.id, query, workspace.userId), listOrganization(workspace.id)]);
  if (query.page !== result.page) redirect(qrListHref({ ...query, page: result.page }));
  return <MyQRCodes query={query} result={result} organization={organization} origin={getServerEnv().appUrl} />;
}
