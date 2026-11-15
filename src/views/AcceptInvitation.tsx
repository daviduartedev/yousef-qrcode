'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AuthCard, FormAlert } from '@/views/Auth';
import { assetRequest } from '@/lib/asset-client';
import type { WorkspaceRole } from '@/lib/workspaces';

type Preview = { email: string; role: WorkspaceRole; organization: string } | null;

export default function AcceptInvitation({ token, preview, signedInAs }: { token: string; preview: Preview; signedInAs: string }) {
  const { t } = useTranslation('organizations');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    const result = await assetRequest('/api/invitations/accept', 'POST', { token });
    setBusy(false);
    if (!result.ok) { setError(t(result.error)); return; }
    router.replace('/overview');
    router.refresh();
  }

  if (!preview) return <AuthCard title={t('Invitation unavailable')} description={t('This invitation is invalid or expired')}>
    <p className="text-center text-sm"><Link href="/overview" className="text-primary hover:underline">{t('Go to your workspace')}</Link></p>
  </AuthCard>;
  const sameEmail = preview.email === signedInAs.trim().toLowerCase();
  return <AuthCard title={t('Join {{name}}', { name: preview.organization })} description={t('You were invited as {{role}}.', { role: t(preview.role) })}>
    <div className="space-y-4">
      <FormAlert message={error ?? undefined} />
      {!sameEmail && <FormAlert message={t('This invitation is for {{email}}. You are signed in as {{current}}. Sign out and sign in with the invited address.', { email: preview.email, current: signedInAs })} />}
      <Button className="w-full" size="lg" disabled={busy || !sameEmail} onClick={() => void accept()}>{t('Accept invitation')}</Button>
      <p className="text-center text-sm"><Link href="/overview" className="text-primary hover:underline">{t('Not now')}</Link></p>
    </div>
  </AuthCard>;
}
