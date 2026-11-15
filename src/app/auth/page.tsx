import type { Metadata } from 'next';
import Auth, { type AuthNotice } from '@/views/Auth';
import { emailDeliveryAvailable } from '@/server/email';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

type Search = Promise<Record<string, string | string[] | undefined>>;
const text = (value: string | string[] | undefined) => typeof value === 'string' ? value : null;

export default async function Authentication({ searchParams }: { searchParams: Search }) {
  const query = await searchParams;
  const notice: AuthNotice = text(query.reset) === 'success' ? 'reset'
    : text(query.verified) === '1' ? (text(query.error) ? 'verify-failed' : 'verified') : null;
  return <Auth initialMode={text(query.mode) === 'signup' ? 'signup' : 'signin'} next={text(query.next)}
    notice={notice} emailAvailable={emailDeliveryAvailable()} />;
}
