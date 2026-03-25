/**
 * RBAC permission matrix for the Nebutra web application.
 *
 * Roles map 1:1 to Clerk organization membership roles.
 * Scopes are coarse-grained feature access units (resource:action format).
 */

// ── Role definitions ────────────────────────────────────────────────────────

export type Role = "admin" | "member" | "viewer";

// ── Scope definitions ───────────────────────────────────────────────────────

export type Scope =
  // Billing
  | "billing:read"
  | "billing:manage"
  // Team / org management
  | "team:read"
  | "team:invite"
  | "team:remove"
  | "team:manage_roles"
  // Projects
  | "project:read"
  | "project:create"
  | "project:update"
  | "project:delete"
  // API keys
  | "api_key:read"
  | "api_key:create"
  | "api_key:delete"
  // Analytics / usage
  | "analytics:read"
  // Settings
  | "settings:read"
  | "settings:update"
  // Audit log
  | "audit_log:read"
  // Super admin
  | "admin:access"
  | "admin:manage_users"
  | "admin:manage_orgs"
  | "admin:impersonate";

// ── Permission matrix ────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Scope>> = {
  admin: new Set<Scope>([
    "billing:read",
    "billing:manage",
    "team:read",
    "team:invite",
    "team:remove",
    "team:manage_roles",
    "project:read",
    "project:create",
    "project:update",
    "project:delete",
    "api_key:read",
    "api_key:create",
    "api_key:delete",
    "analytics:read",
    "settings:read",
    "settings:update",
    "audit_log:read",
    "admin:access",
    "admin:manage_users",
    "admin:manage_orgs",
    "admin:impersonate",
  ]),
  member: new Set<Scope>([
    "billing:read",
    "team:read",
    "team:invite",
    "project:read",
    "project:create",
    "project:update",
    "api_key:read",
    "api_key:create",
    "analytics:read",
    "settings:read",
  ]),
  viewer: new Set<Scope>([
    "billing:read",
    "team:read",
    "project:read",
    "analytics:read",
    "settings:read",
  ]),
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check whether a role has a given permission scope.
 */
export function hasPermission(role: Role, scope: Scope): boolean {
  return ROLE_PERMISSIONS[role]?.has(scope) ?? false;
}

/**
 * Check whether a role has ALL of the given scopes.
 */
export function hasAllPermissions(role: Role, scopes: Scope[]): boolean {
  return scopes.every((scope) => hasPermission(role, scope));
}

/**
 * Check whether a role has ANY of the given scopes.
 */
export function hasAnyPermission(role: Role, scopes: Scope[]): boolean {
  return scopes.some((scope) => hasPermission(role, scope));
}

/**
 * Resolve a Clerk org membership role string to a typed Role.
 * Falls back to "viewer" for unknown/missing roles.
 */
export function resolveRole(clerkRole: string | null | undefined): Role {
  if (clerkRole === "org:admin") return "admin";
  if (clerkRole === "org:member") return "member";
  return "viewer";
}
