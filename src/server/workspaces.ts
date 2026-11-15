import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, asc, eq, gt, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { user, workspaceInvitations, workspaceMembers, workspaces } from '@/server/db/schema';
import { HttpError } from '@/server/http';
import { getServerEnv } from '@/server/env';
import { sendAccountEmail } from '@/server/email';
import {
  can, canAssign, workspaceLimits, workspaceRoles,
  type WorkspaceInvitation, type WorkspaceMember, type WorkspacePermission, type WorkspaceRole, type WorkspaceSummary,
} from '@/lib/workspaces';

const id = z.uuid();
const name = z.string().trim().min(1).max(80).refine(value => !/[\u0000-\u001f\u007f]/.test(value));
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export type ActiveWorkspace = WorkspaceSummary & { userId: string };

export async function listWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
  const rows = await getDb().select({ id: workspaces.id, name: workspaces.name, kind: workspaces.kind, role: workspaceMembers.role })
    .from(workspaceMembers).innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId)).orderBy(sql`${workspaces.kind} = 'organization'`, asc(workspaces.name));
  return rows.map(row => ({ ...row, kind: row.kind as WorkspaceSummary['kind'], role: row.role as WorkspaceRole }));
}

/**
 * Resolves the workspace a request acts on: the requested one when the user is a member, otherwise the personal one.
 * Membership is checked on every request, so a removed member loses access immediately.
 */
export async function resolveWorkspace(userId: string, requested: string | null | undefined): Promise<ActiveWorkspace> {
  const target = requested && id.safeParse(requested).success ? requested : userId;
  const [row] = await getDb().select({ id: workspaces.id, name: workspaces.name, kind: workspaces.kind, role: workspaceMembers.role })
    .from(workspaceMembers).innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, target)));
  if (row) return { ...row, kind: row.kind as WorkspaceSummary['kind'], role: row.role as WorkspaceRole, userId };
  if (target !== userId) return resolveWorkspace(userId, userId);
  throw new HttpError(403, 'Your account has no workspace');
}

export function assertPermission(workspace: ActiveWorkspace, permission: WorkspacePermission) {
  if (!can(workspace.role, permission)) throw new HttpError(403, permission === 'read' ? 'You do not have access to this workspace' : 'Your role does not allow this action');
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

async function lockWorkspace(tx: Tx, workspaceId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'workspace:' + workspaceId}))`);
}

async function ownerCount(tx: Tx, workspaceId: string) {
  const [row] = await tx.select({ total: sql<number>`count(*)::int` }).from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, 'owner')));
  return row.total;
}

function organizationOnly(workspace: ActiveWorkspace) {
  if (workspace.kind !== 'organization') throw new HttpError(400, 'Personal workspaces have no members');
}

export async function createOrganization(userId: string, input: unknown) {
  const parsed = z.object({ name }).strict().safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Enter an organization name');
  return getDb().transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'organizations:' + userId}))`);
    const [{ total }] = await tx.select({ total: sql<number>`count(*)::int` }).from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.userId, userId), eq(workspaces.kind, 'organization'), eq(workspaceMembers.role, 'owner')));
    if (total >= workspaceLimits.maxOrganizationsPerUser) throw new HttpError(409, 'You reached the organization limit');
    const organizationId = randomUUID();
    await tx.insert(workspaces).values({ id: organizationId, name: parsed.data.name, kind: 'organization', createdBy: userId });
    await tx.insert(workspaceMembers).values({ workspaceId: organizationId, userId, role: 'owner' });
    return { id: organizationId, name: parsed.data.name, kind: 'organization' as const, role: 'owner' as const };
  });
}

export async function renameOrganization(workspace: ActiveWorkspace, input: unknown) {
  organizationOnly(workspace);
  assertPermission(workspace, 'own');
  const parsed = z.object({ name }).strict().safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Enter an organization name');
  await getDb().update(workspaces).set({ name: parsed.data.name }).where(and(eq(workspaces.id, workspace.id), eq(workspaces.kind, 'organization')));
  return { ...workspace, name: parsed.data.name };
}

/** Deleting an organization deletes all of its content; members keep their personal workspaces. */
export async function deleteOrganization(workspace: ActiveWorkspace, input: unknown) {
  organizationOnly(workspace);
  assertPermission(workspace, 'own');
  const parsed = z.object({ confirm_name: z.string() }).strict().safeParse(input);
  if (!parsed.success || parsed.data.confirm_name.trim() !== workspace.name) throw new HttpError(400, 'Type the organization name to confirm');
  await getDb().delete(workspaces).where(and(eq(workspaces.id, workspace.id), eq(workspaces.kind, 'organization')));
  return { deleted: true };
}

export async function listMembers(workspace: ActiveWorkspace) {
  assertPermission(workspace, 'read');
  const members = await getDb().select({ user_id: workspaceMembers.userId, name: user.name, email: user.email, role: workspaceMembers.role, joined: workspaceMembers.createdAt })
    .from(workspaceMembers).innerJoin(user, eq(user.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspace.id)).orderBy(asc(user.name), asc(user.email));
  const invitations = can(workspace.role, 'manage') ? await getDb().select().from(workspaceInvitations)
    .where(and(eq(workspaceInvitations.workspaceId, workspace.id), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt), gt(workspaceInvitations.expiresAt, new Date())))
    .orderBy(asc(workspaceInvitations.createdAt)) : [];
  return {
    members: members.map((row): WorkspaceMember => ({ user_id: row.user_id, name: row.name, email: row.email, role: row.role as WorkspaceRole, joined_at: row.joined.toISOString() })),
    invitations: invitations.map((row): WorkspaceInvitation => ({ id: row.id, email: row.email, role: row.role as WorkspaceRole, expires_at: row.expiresAt.toISOString(), created_at: row.createdAt.toISOString() })),
  };
}

const roleInput = z.enum(workspaceRoles);

export async function changeMemberRole(workspace: ActiveWorkspace, memberId: string, input: unknown) {
  organizationOnly(workspace);
  assertPermission(workspace, 'manage');
  const parsed = z.object({ role: roleInput }).strict().safeParse(input);
  if (!parsed.success || !id.safeParse(memberId).success) throw new HttpError(400, 'Choose a valid role');
  return getDb().transaction(async tx => {
    await lockWorkspace(tx, workspace.id);
    const [member] = await tx.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, memberId)));
    if (!member) throw new HttpError(404, 'Member not found');
    if (!canAssign(workspace.role, member.role as WorkspaceRole, parsed.data.role)) throw new HttpError(403, 'Your role does not allow this action');
    if (member.role === 'owner' && parsed.data.role !== 'owner' && await ownerCount(tx, workspace.id) <= 1) throw new HttpError(409, 'An organization needs at least one owner');
    await tx.update(workspaceMembers).set({ role: parsed.data.role }).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, memberId)));
    return { user_id: memberId, role: parsed.data.role };
  });
}

/** Removing a member (or leaving) ends access on the next request; content stays with the organization. */
export async function removeMember(workspace: ActiveWorkspace, memberId: string) {
  organizationOnly(workspace);
  if (!id.safeParse(memberId).success) throw new HttpError(404, 'Member not found');
  const leaving = memberId === workspace.userId;
  if (!leaving) assertPermission(workspace, 'manage');
  return getDb().transaction(async tx => {
    await lockWorkspace(tx, workspace.id);
    const [member] = await tx.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, memberId)));
    if (!member) throw new HttpError(404, 'Member not found');
    if (!leaving && !canAssign(workspace.role, member.role as WorkspaceRole, 'viewer')) throw new HttpError(403, 'Your role does not allow this action');
    if (member.role === 'owner' && await ownerCount(tx, workspace.id) <= 1) throw new HttpError(409, 'An organization needs at least one owner');
    await tx.delete(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userId, memberId)));
    return { removed: true, left: leaving };
  });
}

const inviteInput = z.object({ email: z.email().max(254), role: roleInput }).strict();

/**
 * Invites an email address. The link is returned to the inviter so it can be shared even when no email
 * provider is configured; it is also emailed when one is. Only a hash of the token is stored.
 */
export async function inviteMember(workspace: ActiveWorkspace, input: unknown) {
  organizationOnly(workspace);
  assertPermission(workspace, 'manage');
  const parsed = inviteInput.safeParse(input);
  if (!parsed.success) throw new HttpError(400, 'Enter a valid email and role');
  if (!canAssign(workspace.role, null, parsed.data.role)) throw new HttpError(403, 'Your role does not allow this action');
  const email = parsed.data.email.trim().toLowerCase();
  const token = randomBytes(32).toString('base64url');
  const url = `${getServerEnv().appUrl}/invite/${token}`;
  const result = await getDb().transaction(async tx => {
    await lockWorkspace(tx, workspace.id);
    const [{ members }] = await tx.select({ members: sql<number>`count(*)::int` }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id));
    if (members >= workspaceLimits.maxMembers) throw new HttpError(409, 'The organization reached its member limit');
    const [already] = await tx.select({ id: user.id }).from(workspaceMembers).innerJoin(user, eq(user.id, workspaceMembers.userId))
      .where(and(eq(workspaceMembers.workspaceId, workspace.id), sql`lower(${user.email}) = ${email}`));
    if (already) throw new HttpError(409, 'This person is already a member');
    const pending = await tx.select({ id: workspaceInvitations.id }).from(workspaceInvitations)
      .where(and(eq(workspaceInvitations.workspaceId, workspace.id), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt), gt(workspaceInvitations.expiresAt, new Date())));
    if (pending.length >= workspaceLimits.maxPendingInvitations) throw new HttpError(409, 'Too many pending invitations');
    // A new invitation replaces an earlier pending one for the same address.
    await tx.update(workspaceInvitations).set({ revokedAt: new Date() })
      .where(and(eq(workspaceInvitations.workspaceId, workspace.id), eq(workspaceInvitations.email, email), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt)));
    const [row] = await tx.insert(workspaceInvitations).values({
      workspaceId: workspace.id, email, role: parsed.data.role, tokenHash: hash(token), invitedBy: workspace.userId,
      expiresAt: new Date(Date.now() + workspaceLimits.invitationDays * 86400000),
    }).returning();
    return row;
  });
  void sendAccountEmail(workspace.userId, { kind: 'invitation', to: email, url });
  return { invitation: { id: result.id, email, role: parsed.data.role, expires_at: result.expiresAt.toISOString(), created_at: result.createdAt.toISOString() }, url };
}

export async function revokeInvitation(workspace: ActiveWorkspace, invitationId: string) {
  organizationOnly(workspace);
  assertPermission(workspace, 'manage');
  if (!id.safeParse(invitationId).success) throw new HttpError(404, 'Invitation not found');
  const [row] = await getDb().update(workspaceInvitations).set({ revokedAt: new Date() })
    .where(and(eq(workspaceInvitations.workspaceId, workspace.id), eq(workspaceInvitations.id, invitationId), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt)))
    .returning({ id: workspaceInvitations.id });
  if (!row) throw new HttpError(404, 'Invitation not found');
  return { revoked: true };
}

const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

/** What an invitation link shows before it is accepted; never reveals anything for an invalid token. */
export async function invitationPreview(token: string) {
  if (!tokenPattern.test(token)) return null;
  const [row] = await getDb().select({ email: workspaceInvitations.email, role: workspaceInvitations.role, organization: workspaces.name })
    .from(workspaceInvitations).innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
    .where(and(eq(workspaceInvitations.tokenHash, hash(token)), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt), gt(workspaceInvitations.expiresAt, new Date())));
  return row ? { email: row.email, role: row.role as WorkspaceRole, organization: row.organization } : null;
}

/** Accepting needs the link and a signed-in account with the invited email address. */
export async function acceptInvitation(userId: string, userEmail: string, token: string) {
  if (!tokenPattern.test(token)) throw new HttpError(404, 'This invitation is invalid or expired');
  return getDb().transaction(async tx => {
    const [invitation] = await tx.select().from(workspaceInvitations)
      .where(and(eq(workspaceInvitations.tokenHash, hash(token)), isNull(workspaceInvitations.acceptedAt), isNull(workspaceInvitations.revokedAt), gt(workspaceInvitations.expiresAt, new Date())))
      .for('update');
    if (!invitation) throw new HttpError(404, 'This invitation is invalid or expired');
    if (invitation.email !== userEmail.trim().toLowerCase()) throw new HttpError(403, 'Sign in with the email address that received the invitation');
    await lockWorkspace(tx, invitation.workspaceId);
    await tx.insert(workspaceMembers).values({ workspaceId: invitation.workspaceId, userId, role: invitation.role }).onConflictDoNothing();
    await tx.update(workspaceInvitations).set({ acceptedAt: new Date() }).where(eq(workspaceInvitations.id, invitation.id));
    return { workspace_id: invitation.workspaceId };
  });
}
