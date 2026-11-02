import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/server/auth';

export async function requirePageSession() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect('/auth');
  return session;
}
