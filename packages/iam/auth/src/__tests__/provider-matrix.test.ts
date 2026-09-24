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

  it("marks dev as dev-only", () => {
    expect(AUTH_PROVIDER_MATRIX.dev.tier).toBe("dev-only");
    expect(isCapabilityDeclared("dev", "passkeys")).toBe(false);
  });

  it("lists first-class + optional-enterprise for product recommendations", () => {
    const list = listFirstClassAuthProviders();
    expect(list).toEqual(expect.arrayContaining(["better-auth"]));
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
