import type { Metadata } from 'next';
import { requirePageSession } from '@/server/session';
import { invitationPreview } from '@/server/workspaces';
import AcceptInvitation from '@/views/AcceptInvitation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Invitation', robots: { index: false } };

/** Invitation link: sign in first, then accept with the invited email address. */
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await requirePageSession(`/invite/${encodeURIComponent(token)}`);
  const preview = await invitationPreview(token);
  return <AcceptInvitation token={token} preview={preview} signedInAs={session.user.email} />;
}
