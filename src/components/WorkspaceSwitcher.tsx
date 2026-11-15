'use client';
import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import type { WorkspaceSummary } from '@/lib/workspaces';

/** Chooses the workspace whose content the app shows; the server checks membership on every request. */
export function WorkspaceSwitcher() {
  const { t } = useTranslation('organizations');
  const id = useId();
  const [state, setState] = useState<{ workspaces: WorkspaceSummary[]; active: WorkspaceSummary } | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    fetch('/api/workspaces', { credentials: 'same-origin' }).then(response => response.ok ? response.json() : null)
      .then(body => { if (alive && body) setState(body); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  async function choose(workspaceId: string) {
    setBusy(true);
    const response = await fetch('/api/workspaces/active', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: workspaceId }) });
    setBusy(false);
    // Content belongs to the workspace, so the overview is the safe page to land on after switching.
    if (response.ok) { router.replace('/overview'); router.refresh(); }
  }

  if (!state) return <div className="h-14" aria-hidden="true" />;
  const label = (workspace: WorkspaceSummary) => workspace.kind === 'personal' ? t('Personal workspace') : workspace.name;
  return <div className="space-y-1 px-1">
    <label htmlFor={`${id}-workspace`} className="text-xs font-medium text-muted-foreground">{t('Workspace')}</label>
    <select id={`${id}-workspace`} value={state.active.id} disabled={busy} onChange={event => void choose(event.target.value)}
      className="min-h-11 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring">
      {state.workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{label(workspace)} · {t(workspace.role)}</option>)}
    </select>
  </div>;
}
