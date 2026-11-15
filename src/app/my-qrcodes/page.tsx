import { requirePageSession } from '@/server/session';
import { redirect } from 'next/navigation';
import { qrListHref, readQRListQuery } from '@/lib/qr-list';
import { listCodePage } from '@/server/qr-codes';
import { getServerEnv } from '@/server/env';
import MyQRCodes from '@/views/MyQRCodes';
export const runtime = 'nodejs';
export default async function MyCodes({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePageSession();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') params.set(key, value);
  }
  const query = readQRListQuery(params);
  const result = await listCodePage(user.id, query);
  if (query.page !== result.page) redirect(qrListHref({ ...query, page: result.page }));
  return <MyQRCodes query={query} result={result} origin={getServerEnv().appUrl} />;
}
