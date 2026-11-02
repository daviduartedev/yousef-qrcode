import { requirePageSession } from '@/server/session';
import Index from '@/views/Index';
export const runtime = 'nodejs';
export default async function Workspace() {
  await requirePageSession();
  return <Index />;
}
