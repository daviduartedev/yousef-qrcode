import { requirePageWorkspace } from '@/server/workspace-session';
import Index from '@/views/Index';
import { requestedPath } from '@/lib/auth-paths';
export const runtime = 'nodejs';
export default async function Workspace({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageWorkspace(requestedPath('/app', await searchParams));
  return <Index />;
}
