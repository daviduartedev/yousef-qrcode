import type { Metadata } from 'next';
import ResetPassword from '@/views/ResetPassword';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPasswordPage({ searchParams }: { searchParams: Search }) {
  const query = await searchParams;
  const token = typeof query.token === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(query.token) ? query.token : null;
  return <ResetPassword token={typeof query.error === 'string' ? null : token} />;
}
