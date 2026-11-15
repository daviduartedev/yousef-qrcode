'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { assetRequest } from '@/lib/asset-client';
import { can, canAssign, workspaceRoles, type WorkspaceInvitation, type WorkspaceMember, type WorkspaceRole, type WorkspaceSummary } from '@/lib/workspaces';

const field = 'min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring';
type Props = { active: WorkspaceSummary & { userId: string }; workspaces: WorkspaceSummary[]; members: WorkspaceMember[]; invitations: WorkspaceInvitation[] };

/** Organization settings: create and switch organizations, members, roles and invitations. */
export default function Organization({ active, workspaces, members, invitations }: Props) {
  const { t, i18n } = useTranslation('organizations');
  const router = useRouter();
  const id = useId();
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [rename, setRename] = useState(active.name);
  const [invite, setInvite] = useState<{ email: string; role: WorkspaceRole }>({ email: '', role: 'editor' });
  const dates = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeZone: 'UTC' });
  const organization = active.kind === 'organization';
  const manage = can(active.role, 'manage');
  const own = can(active.role, 'own');

  async function run(path: string, method: 'POST' | 'PATCH' | 'DELETE', body: unknown, success: string, after?: (value: Record<string, unknown>) => void) {
    setMessage(null);
    const result = await assetRequest(path, method, body);
    if (!result.ok) { setMessage({ tone: 'error', text: t(result.error) }); return false; }
    setMessage({ tone: 'success', text: t(success) });
    after?.(result.value);
    router.refresh();
    return true;
  }

  async function switchTo(workspaceId: string) {
    const result = await assetRequest('/api/workspaces/active', 'POST', { id: workspaceId });
    if (result.ok) { router.replace('/settings/organization'); router.refresh(); }
  }

  return <WorkspaceShell>
    <main className="space-y-6 px-4 py-5 sm:px-6 sm:py-6 2xl:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('Organization')}</h1>
        <p className="text-sm text-muted-foreground">{t(organization
          ? 'Members of this organization share its QR codes, pages, cards, forms and files according to their role.'
          : 'This is your personal workspace. Create an organization to work with other people.')}</p>
      </div>
      {message && <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${message.tone === 'error' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-emerald-500/40 bg-emerald-500/10'}`}>{message.text}</p>}

      <section aria-labelledby={`${id}-workspaces`} className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
        <h2 id={`${id}-workspaces`} className="text-lg font-semibold">{t('Your workspaces')}</h2>
        <ul className="divide-y">
          {workspaces.map(workspace => <li key={workspace.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span><span className="font-medium" dir="auto">{workspace.kind === 'personal' ? t('Personal workspace') : workspace.name}</span>
              <span className="ms-2 text-sm text-muted-foreground">{t(workspace.role)}</span></span>
            {workspace.id === active.id ? <span className="text-sm text-muted-foreground">{t('Current')}</span>
              : <Button size="sm" variant="outline" onClick={() => void switchTo(workspace.id)}>{t('Switch')}</Button>}
          </li>)}
        </ul>
        <form className="flex flex-wrap gap-2" onSubmit={async event => { event.preventDefault();
          await run('/api/workspaces', 'POST', { name: newName }, 'Organization created. Switch to it to invite people.', () => setNewName('')); }}>
          <label htmlFor={`${id}-new`} className="sr-only">{t('Organization name')}</label>
          <input id={`${id}-new`} className={`${field} max-w-sm`} placeholder={t('Organization name')} maxLength={80} value={newName} onChange={event => setNewName(event.target.value)} dir="auto" />
          <Button type="submit" disabled={!newName.trim()}>{t('Create organization')}</Button>
        </form>
      </section>

      {organization && <>
        <section aria-labelledby={`${id}-members`} className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <h2 id={`${id}-members`} className="text-lg font-semibold">{t('Members')}</h2>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-start text-muted-foreground">
              <th scope="col" className="py-2 text-start font-medium">{t('Name')}</th><th scope="col" className="py-2 text-start font-medium">{t('Email')}</th>
              <th scope="col" className="py-2 text-start font-medium">{t('Role')}</th><th scope="col" className="py-2"><span className="sr-only">{t('Actions')}</span></th></tr></thead>
            <tbody>{members.map(member => {
              const self = member.user_id === active.userId;
              const editable = manage && !self && canAssign(active.role, member.role, member.role);
              return <tr key={member.user_id} className="border-t">
                <td className="py-2" dir="auto">{member.name}{self && <span className="ms-1 text-muted-foreground">({t('you')})</span>}</td>
                <td className="py-2" dir="ltr">{member.email}</td>
                <td className="py-2">{editable ? <>
                  <label htmlFor={`${id}-role-${member.user_id}`} className="sr-only">{t('Role of {{name}}', { name: member.name })}</label>
                  <select id={`${id}-role-${member.user_id}`} className={`${field} w-36`} value={member.role}
                    onChange={event => void run(`/api/workspaces/current/members/${member.user_id}`, 'PATCH', { role: event.target.value }, 'Role updated.')}>
                    {workspaceRoles.filter(role => canAssign(active.role, member.role, role)).map(role => <option key={role} value={role}>{t(role)}</option>)}
                  </select></> : t(member.role)}</td>
                <td className="py-2 text-end">{self ? <Button size="sm" variant="ghost" onClick={() => {
                    if (window.confirm(t('Leave {{name}}? You lose access to its content.', { name: active.name })))
                      void run(`/api/workspaces/current/members/${member.user_id}`, 'DELETE', undefined, 'You left the organization.', () => { router.replace('/overview'); router.refresh(); });
                  }}>{t('Leave')}</Button>
                  : editable && <Button size="sm" variant="ghost" aria-label={t('Remove {{name}}', { name: member.name })} onClick={() => {
                    if (window.confirm(t('Remove {{name}} from the organization? Their access ends immediately; their content stays.', { name: member.name })))
                      void run(`/api/workspaces/current/members/${member.user_id}`, 'DELETE', undefined, 'Member removed.');
                  }}><Trash2 className="size-4 text-destructive" aria-hidden="true" /></Button>}</td>
              </tr>;
            })}</tbody>
          </table></div>
        </section>

        {manage && <section aria-labelledby={`${id}-invite`} className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <h2 id={`${id}-invite`} className="text-lg font-semibold">{t('Invite people')}</h2>
          <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]" onSubmit={async event => { event.preventDefault();
            await run('/api/workspaces/current/invitations', 'POST', invite, 'Invitation created. Share the link below with the person; it expires in 7 days.',
              value => { setLink(String(value.url)); setInvite({ email: '', role: invite.role }); }); }}>
            <label htmlFor={`${id}-email`} className="sr-only">{t('Email')}</label>
            <input id={`${id}-email`} type="email" className={field} placeholder={t('Email')} value={invite.email} dir="ltr" onChange={event => setInvite({ ...invite, email: event.target.value })} />
            <label htmlFor={`${id}-invite-role`} className="sr-only">{t('Role')}</label>
            <select id={`${id}-invite-role`} className={field} value={invite.role} onChange={event => setInvite({ ...invite, role: event.target.value as WorkspaceRole })}>
              {workspaceRoles.filter(role => canAssign(active.role, null, role)).map(role => <option key={role} value={role}>{t(role)}</option>)}
            </select>
            <Button type="submit" disabled={!invite.email.trim()}>{t('Invite')}</Button>
          </form>
          {link && <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted p-2 text-sm">
            <code className="min-w-0 flex-1 truncate" dir="ltr">{link}</code>
            <Button size="sm" variant="outline" onClick={() => void navigator.clipboard?.writeText(link)}><Copy className="me-1 size-4" aria-hidden="true" />{t('Copy link')}</Button>
          </div>}
          <p className="text-xs text-muted-foreground">{t('Viewers can see everything; editors can also create and change content; admins can also manage members; owners can also rename or delete the organization.')}</p>
          {invitations.length > 0 && <ul className="divide-y text-sm">{invitations.map(invitation => <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span dir="ltr">{invitation.email}</span>
            <span className="text-muted-foreground">{t(invitation.role)} · {t('expires {{date}}', { date: dates.format(new Date(invitation.expires_at)) })}</span>
            <Button size="sm" variant="ghost" onClick={() => void run(`/api/workspaces/current/invitations/${invitation.id}`, 'DELETE', undefined, 'Invitation revoked.')}>{t('Revoke')}</Button>
          </li>)}</ul>}
        </section>}

        {own && <section aria-labelledby={`${id}-settings`} className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <h2 id={`${id}-settings`} className="text-lg font-semibold">{t('Organization settings')}</h2>
          <form className="flex flex-wrap gap-2" onSubmit={async event => { event.preventDefault(); await run('/api/workspaces/current', 'PATCH', { name: rename }, 'Organization renamed.'); }}>
            <label htmlFor={`${id}-rename`} className="sr-only">{t('Organization name')}</label>
            <input id={`${id}-rename`} className={`${field} max-w-sm`} maxLength={80} value={rename} onChange={event => setRename(event.target.value)} dir="auto" />
            <Button type="submit" variant="outline" disabled={!rename.trim() || rename === active.name}>{t('Rename')}</Button>
          </form>
          <Button variant="destructive" onClick={() => {
            const typed = window.prompt(t('Deleting {{name}} deletes all of its QR codes, pages, cards, forms and files. Type the organization name to confirm.', { name: active.name }));
            if (typed !== null) void run('/api/workspaces/current', 'DELETE', { confirm_name: typed }, 'Organization deleted.', () => { router.replace('/overview'); router.refresh(); });
          }}>{t('Delete organization')}</Button>
        </section>}
      </>}
    </main>
  </WorkspaceShell>;
}
