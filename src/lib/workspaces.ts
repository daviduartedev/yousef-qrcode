/** Shared contract of workspaces: a personal workspace per account and organizations with members. */
export const workspaceRoles = ['owner', 'admin', 'editor', 'viewer'] as const;
export type WorkspaceRole = (typeof workspaceRoles)[number];
export type WorkspacePermission = 'read' | 'write' | 'manage' | 'own';

/**
 * Role matrix. `read`: lists, editors in read-only use, analytics, answers and contacts.
 * `write`: create, edit, publish and delete content. `manage`: invite, change roles and remove members (not owners).
 * `own`: rename or delete the organization and manage owners.
 */
export const rolePermissions: Record<WorkspaceRole, readonly WorkspacePermission[]> = {
  owner: ['read', 'write', 'manage', 'own'],
  admin: ['read', 'write', 'manage'],
  editor: ['read', 'write'],
  viewer: ['read'],
};
export const can = (role: WorkspaceRole, permission: WorkspacePermission) => rolePermissions[role].includes(permission);

/** Admins can assign editor and viewer roles; only owners can make or change admins and owners. */
export function canAssign(actor: WorkspaceRole, from: WorkspaceRole | null, to: WorkspaceRole) {
  if (actor === 'owner') return true;
  if (actor !== 'admin') return false;
  return ['editor', 'viewer'].includes(to) && (from === null || ['editor', 'viewer'].includes(from));
}

export const workspaceLimits = { maxOrganizationsPerUser: 10, maxMembers: 50, invitationDays: 7, maxPendingInvitations: 50 } as const;
export const workspaceCookie = 'qrc_workspace';

export type WorkspaceSummary = { id: string; name: string; kind: 'personal' | 'organization'; role: WorkspaceRole };
export type WorkspaceMember = { user_id: string; name: string; email: string; role: WorkspaceRole; joined_at: string };
export type WorkspaceInvitation = { id: string; email: string; role: WorkspaceRole; expires_at: string; created_at: string };
