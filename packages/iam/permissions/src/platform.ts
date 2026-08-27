/**
 * Platform staff authorization — for the ecosystem control plane (the `admin`
 * host in the brand domain SSOT).
 *
 * Deliberately separate from `DEFAULT_ROLES` in `./roles`. Tenant roles
 * (owner / admin / member / viewer / billing_admin) answer "what may this
 * member do inside their workspace"; platform staff roles answer "what may a
 * platform operator do ACROSS every tenant". Merging the two maps is how a
 * staff capability leaks into a tenant session, so they never share a registry:
 * `platformAbilityFor` builds its ability from scratch instead of going through
 * `CASLProvider`, which always seeds itself with the tenant roles.
 *
 * See docs/plans/2026-07-28-nebutra-admin-control-plane-design.md §6.
 */

import { type Ability, AbilityBuilder, createMongoAbility } from "@casl/ability";

/** Ordered least → most senior. Seniority is linear and inclusive. */
export const PLATFORM_STAFF_ROLES = [
  "platform_readonly",
  "platform_support",
  "platform_operator",
  "platform_owner",
] as const;

export type PlatformStaffRole = (typeof PLATFORM_STAFF_ROLES)[number];

export type PlatformAction =
  | "read"
  | "impersonate"
  | "invite"
  | "suspend"
  | "unsuspend"
  | "replay"
  | "override"
  | "grant"
  | "revoke";

export type PlatformResource =
  | "Fleet"
  | "Tenant"
  | "RouterSupply"
  | "ForgeJob"
  | "FeatureFlag"
  | "PlatformStaff"
  | "AuditLog";

export type PlatformAbility = Ability<[PlatformAction, PlatformResource]>;

const ALL_RESOURCES: PlatformResource[] = [
  "Fleet",
  "Tenant",
  "RouterSupply",
  "ForgeJob",
  "FeatureFlag",
  "PlatformStaff",
  "AuditLog",
];

/**
 * Capabilities a role adds on top of everything the role below it already has.
 * `platform_readonly` is the floor: read everything, change nothing.
 */
const CAPABILITIES: Record<PlatformStaffRole, Array<[PlatformAction, PlatformResource]>> = {
  platform_readonly: ALL_RESOURCES.map((resource) => ["read", resource]),
  platform_support: [
    ["impersonate", "Tenant"],
    ["invite", "Tenant"],
  ],
  platform_operator: [
    ["suspend", "Tenant"],
    ["unsuspend", "Tenant"],
    ["replay", "ForgeJob"],
    ["override", "FeatureFlag"],
  ],
  // Staff grants are the privilege-escalation edge: only the owner tier moves it.
  platform_owner: [
    ["grant", "PlatformStaff"],
    ["revoke", "PlatformStaff"],
  ],
};

export function isPlatformStaffRole(role: string): role is PlatformStaffRole {
  return (PLATFORM_STAFF_ROLES as readonly string[]).includes(role);
}

/**
 * Accepts either the TypeScript role string (`platform_owner`) or the Prisma
 * enum spelling (`PLATFORM_OWNER`). Returns null for anything unrecognized —
 * an unknown role must degrade to "no access", never to a default.
 */
export function normalizePlatformStaffRole(
  role: string | null | undefined,
): PlatformStaffRole | null {
  if (!role) return null;
  const normalized = role.toLowerCase();
  return isPlatformStaffRole(normalized) ? normalized : null;
}

/** Roles at or below `role` in seniority, including `role` itself. */
export function platformRoleHierarchy(role: PlatformStaffRole): PlatformStaffRole[] {
  const ceiling = PLATFORM_STAFF_ROLES.indexOf(role);
  return PLATFORM_STAFF_ROLES.slice(0, ceiling + 1);
}

export function platformAbilityFor(role: PlatformStaffRole): PlatformAbility {
  const { can, build } = new AbilityBuilder<PlatformAbility>(createMongoAbility);

  for (const inherited of platformRoleHierarchy(role)) {
    for (const [action, resource] of CAPABILITIES[inherited]) {
      can(action, resource);
    }
  }

  return build();
}

/**
 * Convenience guard for route handlers. Takes the raw role so callers can pass
 * whatever came out of the `PlatformStaff` row without pre-validating it; an
 * unknown or revoked role simply cannot do anything.
 */
export function canPlatform(
  role: string | null | undefined,
  action: PlatformAction,
  resource: PlatformResource,
): boolean {
  const normalized = normalizePlatformStaffRole(role);
  if (!normalized) return false;
  return platformAbilityFor(normalized).can(action, resource);
}
