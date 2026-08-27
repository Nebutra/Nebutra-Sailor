/**
 * Clerk organization role constants.
 * Matches the org_role claim in Clerk JWTs.
 */
export const ROLES = {
  OWNER: "org:owner",
  ADMIN: "org:admin",
  MEMBER: "org:member",
  VIEWER: "org:viewer",
} as const;

export type OrgRole = (typeof ROLES)[keyof typeof ROLES];

/** Roles that can perform write operations */
export const WRITE_ROLES = [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER] as const;

/** Roles that can perform admin operations (billing, team management) */
export const ADMIN_ROLES = [ROLES.OWNER, ROLES.ADMIN] as const;

/** Only owners can delete the organization or transfer ownership */
export const OWNER_ONLY = [ROLES.OWNER] as const;
