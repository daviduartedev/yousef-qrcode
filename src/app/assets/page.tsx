import type { Metadata } from 'next';
import { requirePageWorkspace } from '@/server/workspace-session';
import { requestedPath } from '@/lib/auth-paths';
import { listAssets, readAssetQuery } from '@/server/assets';
import Assets from '@/views/Assets';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Asset library', robots: { index: false } };

export default async function AssetsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const { workspace } = await requirePageWorkspace(requestedPath('/assets', raw));
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === 'string') params.set(key, value);
  const query = readAssetQuery(params);
  const data = await listAssets(workspace.id, query);
  return <Assets data={data} view={{ q: query.q, kind: query.kind, folder: query.folder, page: data.page }} />;
}
