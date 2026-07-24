import { describe, expect, it } from "vitest";
import {
  AUTH_PROVIDER_MATRIX,
  getAuthProviderProfile,
  isCapabilityDeclared,
  isCapabilityEffective,
  listFirstClassAuthProviders,
} from "../provider-matrix";

describe("AUTH_PROVIDER_MATRIX", () => {
  it("defaults better-auth to first-class with rich declared capabilities", () => {
    const ba = getAuthProviderProfile("better-auth");
    expect(ba.tier).toBe("first-class");
    expect(ba.supports.organizations).toBe(true);
    expect(ba.supports.passkeys).toBe(true);
    // Impersonation stays off until an adapter implements end-to-end support
    expect(ba.supports.impersonation).toBe(false);
  });

  it("marks clerk as optional-enterprise", () => {
    expect(AUTH_PROVIDER_MATRIX.clerk.tier).toBe("optional-enterprise");
  });

  it("marks nextauth and supabase as migration-only with no optional capabilities", () => {
    expect(AUTH_PROVIDER_MATRIX.nextauth.tier).toBe("migration");
    expect(AUTH_PROVIDER_MATRIX.supabase.tier).toBe("migration");
    expect(isCapabilityDeclared("nextauth", "organizations")).toBe(false);
    expect(isCapabilityDeclared("supabase", "passkeys")).toBe(false);
  });

  it("lists first-class + optional-enterprise for product recommendations", () => {
    const list = listFirstClassAuthProviders();
    expect(list).toEqual(expect.arrayContaining(["better-auth", "clerk"]));
    expect(list).not.toContain("nextauth");
    expect(list).not.toContain("supabase");
    expect(list).not.toContain("dev");
  });

  it("ANDs declared matrix with runtime probe for effective support", () => {
    expect(
      isCapabilityEffective("better-auth", "organizations", {
        passkeys: false,
        organizations: true,
        twoFactor: false,
        magicLink: false,
        impersonation: false,
      }),
    ).toBe(true);

    // Runtime says yes but matrix forbids impersonation
    expect(
      isCapabilityEffective("better-auth", "impersonation", {
        passkeys: false,
        organizations: false,
        twoFactor: false,
        magicLink: false,
        impersonation: true,
      }),
    ).toBe(false);

    // Matrix allows orgs but runtime probe is off
    expect(
      isCapabilityEffective("better-auth", "organizations", {
        passkeys: false,
        organizations: false,
        twoFactor: false,
        magicLink: false,
        impersonation: false,
      }),
    ).toBe(false);
  });
});
