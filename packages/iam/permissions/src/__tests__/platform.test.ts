import { describe, expect, it } from "vitest";
import {
  canPlatform,
  isPlatformStaffRole,
  normalizePlatformStaffRole,
  PLATFORM_STAFF_ROLES,
  platformAbilityFor,
  platformRoleHierarchy,
} from "../platform";
import { DEFAULT_ROLES } from "../roles";

describe("platform staff authorization", () => {
  it("keeps platform roles out of the tenant role registry", () => {
    // The whole point of a separate module: a tenant session resolving roles
    // from DEFAULT_ROLES must never be able to name a platform capability.
    for (const role of Object.keys(DEFAULT_ROLES)) {
      expect(role.startsWith("platform_")).toBe(false);
    }
    for (const role of PLATFORM_STAFF_ROLES) {
      expect(DEFAULT_ROLES[role]).toBeUndefined();
    }
  });

  it("gives every staff role read access and nothing else at the floor", () => {
    const readonly = platformAbilityFor("platform_readonly");
    expect(readonly.can("read", "Fleet")).toBe(true);
    expect(readonly.can("read", "Tenant")).toBe(true);
    expect(readonly.can("read", "AuditLog")).toBe(true);

    expect(readonly.can("suspend", "Tenant")).toBe(false);
    expect(readonly.can("impersonate", "Tenant")).toBe(false);
    expect(readonly.can("replay", "ForgeJob")).toBe(false);
    expect(readonly.can("grant", "PlatformStaff")).toBe(false);
  });

  it("scopes support to customer-facing actions without operational writes", () => {
    const support = platformAbilityFor("platform_support");
    expect(support.can("impersonate", "Tenant")).toBe(true);
    expect(support.can("invite", "Tenant")).toBe(true);
    expect(support.can("suspend", "Tenant")).toBe(false);
    expect(support.can("override", "FeatureFlag")).toBe(false);
  });

  it("gives the operator tier suspension, replay, and flag overrides", () => {
    const operator = platformAbilityFor("platform_operator");
    expect(operator.can("suspend", "Tenant")).toBe(true);
    expect(operator.can("unsuspend", "Tenant")).toBe(true);
    expect(operator.can("replay", "ForgeJob")).toBe(true);
    expect(operator.can("override", "FeatureFlag")).toBe(true);
    // Seniority is inclusive — the operator inherits support.
    expect(operator.can("impersonate", "Tenant")).toBe(true);
    // Privilege escalation stays with the owner.
    expect(operator.can("grant", "PlatformStaff")).toBe(false);
    expect(operator.can("revoke", "PlatformStaff")).toBe(false);
  });

  it("reserves staff grants for the owner tier", () => {
    const owner = platformAbilityFor("platform_owner");
    expect(owner.can("grant", "PlatformStaff")).toBe(true);
    expect(owner.can("revoke", "PlatformStaff")).toBe(true);
    expect(owner.can("suspend", "Tenant")).toBe(true);
    expect(owner.can("read", "Fleet")).toBe(true);
  });

  it("builds an inclusive hierarchy least → most senior", () => {
    expect(platformRoleHierarchy("platform_readonly")).toEqual(["platform_readonly"]);
    expect(platformRoleHierarchy("platform_owner")).toEqual([
      "platform_readonly",
      "platform_support",
      "platform_operator",
      "platform_owner",
    ]);
  });

  it("normalizes the Prisma enum spelling and rejects everything else", () => {
    expect(normalizePlatformStaffRole("PLATFORM_OPERATOR")).toBe("platform_operator");
    expect(normalizePlatformStaffRole("platform_operator")).toBe("platform_operator");
    expect(normalizePlatformStaffRole("owner")).toBeNull();
    expect(normalizePlatformStaffRole("admin")).toBeNull();
    expect(normalizePlatformStaffRole("")).toBeNull();
    expect(normalizePlatformStaffRole(null)).toBeNull();
    expect(normalizePlatformStaffRole(undefined)).toBeNull();
    expect(isPlatformStaffRole("platform_owner")).toBe(true);
    expect(isPlatformStaffRole("owner")).toBe(false);
  });

  it("denies unknown roles through the convenience guard", () => {
    expect(canPlatform("PLATFORM_OWNER", "grant", "PlatformStaff")).toBe(true);
    expect(canPlatform("platform_support", "impersonate", "Tenant")).toBe(true);
    // A tenant role name must not buy anything on the platform surface.
    expect(canPlatform("owner", "read", "Fleet")).toBe(false);
    expect(canPlatform(null, "read", "Fleet")).toBe(false);
    expect(canPlatform(undefined, "suspend", "Tenant")).toBe(false);
  });
});
