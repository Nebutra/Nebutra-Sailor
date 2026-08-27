import { describe, expect, it } from "vitest";
import type { Scope } from "../permissions";
import { hasAllPermissions, hasAnyPermission, hasPermission, resolveRole } from "../permissions";

const ADMIN_SCOPES: Scope[] = [
  "admin:access",
  "admin:manage_users",
  "admin:manage_orgs",
  "admin:impersonate",
];

describe("admin permission scopes", () => {
  describe("admin role", () => {
    it("has all admin:* scopes", () => {
      for (const scope of ADMIN_SCOPES) {
        expect(hasPermission("admin", scope)).toBe(true);
      }
    });

    it("has all admin:* scopes via hasAllPermissions", () => {
      expect(hasAllPermissions("admin", ADMIN_SCOPES)).toBe(true);
    });

    it("has any admin:* scope via hasAnyPermission", () => {
      expect(hasAnyPermission("admin", ADMIN_SCOPES)).toBe(true);
    });
  });

  describe("member role", () => {
    it("does NOT have any admin:* scopes", () => {
      for (const scope of ADMIN_SCOPES) {
        expect(hasPermission("member", scope)).toBe(false);
      }
    });

    it("returns false for hasAllPermissions with admin scopes", () => {
      expect(hasAllPermissions("member", ADMIN_SCOPES)).toBe(false);
    });

    it("returns false for hasAnyPermission with admin scopes", () => {
      expect(hasAnyPermission("member", ADMIN_SCOPES)).toBe(false);
    });
  });

  describe("viewer role", () => {
    it("does NOT have any admin:* scopes", () => {
      for (const scope of ADMIN_SCOPES) {
        expect(hasPermission("viewer", scope)).toBe(false);
      }
    });

    it("returns false for hasAllPermissions with admin scopes", () => {
      expect(hasAllPermissions("viewer", ADMIN_SCOPES)).toBe(false);
    });

    it("returns false for hasAnyPermission with admin scopes", () => {
      expect(hasAnyPermission("viewer", ADMIN_SCOPES)).toBe(false);
    });
  });
});

describe("resolveRole", () => {
  it('resolves "org:admin" to admin', () => {
    expect(resolveRole("org:admin")).toBe("admin");
  });

  it('resolves "org:member" to member', () => {
    expect(resolveRole("org:member")).toBe("member");
  });

  it("falls back to viewer for unknown role string", () => {
    expect(resolveRole("org:unknown")).toBe("viewer");
  });

  it("falls back to viewer for arbitrary string", () => {
    expect(resolveRole("superadmin")).toBe("viewer");
  });

  it("falls back to viewer for null", () => {
    expect(resolveRole(null)).toBe("viewer");
  });

  it("falls back to viewer for undefined", () => {
    expect(resolveRole(undefined)).toBe("viewer");
  });

  it("falls back to viewer for empty string", () => {
    expect(resolveRole("")).toBe("viewer");
  });
});
