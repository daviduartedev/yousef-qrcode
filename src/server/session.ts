import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/server/auth';
import { signInPath } from '@/lib/auth-paths';

/** Without a session, send the visitor to sign in and bring them back to `returnTo` afterwards. */
export async function requirePageSession(returnTo?: string) {
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) redirect(signInPath(returnTo));
  return session;
}
