import type { AccountRole } from "@/lib/domain/contracts";

export const ACCOUNT_ROLES = ["collector", "creator"] as const;
export const SYSTEM_ROLES = ["admin", "ops"] as const;
export const ALL_ROLES = [...ACCOUNT_ROLES, ...SYSTEM_ROLES] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];
export type AnyRole = AccountRole | SystemRole;

export const RESOURCES = [
  "account",
  "session",
  "profile",
  "studio",
  "workshop",
  "drop",
  "world",
  "post",
  "collection",
  "certificate",
  "receipt",
  "notification",
  "message",
  "moderation",
  "analytics",
  "admin",
  "feature_flag",
  "audit_log",
  "payout",
  "live_session",
] as const;

export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "list",
  "manage",
  "export",
] as const;

export type Action = (typeof ACTIONS)[number];

export type PermissionKey = `${Resource}:${Action}`;

type PermissionMatrix = Record<AnyRole, ReadonlySet<PermissionKey>>;

const COLLECTOR_PERMISSIONS: ReadonlySet<PermissionKey> = new Set([
  "account:read",
  "account:update",
  "account:delete",
  "account:export",
  "session:read",
  "session:delete",
  "profile:read",
  "profile:update",
  "studio:read",
  "collection:read",
  "collection:list",
  "collection:create",
  "collection:update",
  "certificate:read",
  "receipt:read",
  "receipt:list",
  "notification:read",
  "notification:list",
  "notification:update",
  "message:read",
  "message:list",
  "message:create",
  "post:read",
  "post:list",
  "drop:read",
  "world:read",
  "live_session:read",
]);

const CREATOR_PERMISSIONS: ReadonlySet<PermissionKey> = new Set([
  ...COLLECTOR_PERMISSIONS,
  "studio:update",
  "workshop:read",
  "workshop:manage",
  "drop:create",
  "drop:update",
  "drop:delete",
  "drop:list",
  "world:create",
  "world:update",
  "world:list",
  "post:create",
  "post:update",
  "post:delete",
  "live_session:create",
  "live_session:update",
  "live_session:manage",
  "analytics:read",
  "payout:read",
  "payout:list",
  "moderation:read",
]);

const ADMIN_PERMISSIONS: ReadonlySet<PermissionKey> = new Set([
  ...CREATOR_PERMISSIONS,
  "account:list",
  "account:manage",
  "admin:read",
  "admin:manage",
  "moderation:manage",
  "moderation:list",
  "feature_flag:read",
  "feature_flag:manage",
  "audit_log:read",
  "audit_log:list",
  "payout:manage",
  "analytics:list",
  "analytics:manage",
]);

const OPS_PERMISSIONS: ReadonlySet<PermissionKey> = new Set([
  ...ADMIN_PERMISSIONS,
  "audit_log:manage",
  "feature_flag:update",
]);

const PERMISSION_MATRIX: PermissionMatrix = {
  collector: COLLECTOR_PERMISSIONS,
  creator: CREATOR_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  ops: OPS_PERMISSIONS,
};

export function hasPermission(
  roles: readonly AnyRole[],
  resource: Resource,
  action: Action
): boolean {
  const key: PermissionKey = `${resource}:${action}`;
  return roles.some((role) => {
    const perms = PERMISSION_MATRIX[role];
    return perms ? perms.has(key) : false;
  });
}

export function getPermissionsForRole(role: AnyRole): ReadonlySet<PermissionKey> {
  return PERMISSION_MATRIX[role] ?? new Set();
}

export function isAccountRole(value: string): value is AccountRole {
  return value === "collector" || value === "creator";
}

export function isSystemRole(value: string): value is SystemRole {
  return value === "admin" || value === "ops";
}

export function isValidRole(value: string): value is AnyRole {
  return isAccountRole(value) || isSystemRole(value);
}

export function canSwitchToRole(
  currentRoles: readonly AccountRole[],
  targetRole: AccountRole
): { allowed: boolean; reason: string } {
  if (!isAccountRole(targetRole)) {
    return { allowed: false, reason: "invalid_role" };
  }

  if (currentRoles.includes(targetRole)) {
    return { allowed: true, reason: "already_has_role" };
  }

  if (targetRole === "creator" && !currentRoles.includes("creator")) {
    return { allowed: true, reason: "upgrade_to_creator" };
  }

  return { allowed: true, reason: "role_switch" };
}
