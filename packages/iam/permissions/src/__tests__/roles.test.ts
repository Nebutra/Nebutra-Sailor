import { describe, expect, it } from "vitest";
import { DEFAULT_ROLES, getDefaultRoles, getRoleDefinition, getRoleHierarchy } from "../roles";

describe("DEFAULT_ROLES", () => {
  it("defines all expected roles", () => {
    const roleNames = Object.keys(DEFAULT_ROLES);
    expect(roleNames).toContain("owner");
    expect(roleNames).toContain("admin");
    expect(roleNames).toContain("member");
    expect(roleNames).toContain("viewer");
    expect(roleNames).toContain("billing_admin");
    expect(roleNames).toContain("guest");
  });

  it("owner has manage action on all resources", () => {
    const owner = DEFAULT_ROLES.owner;
    expect(owner).toBeDefined();
    const actions = owner?.rules.flatMap((r) => (Array.isArray(r.action) ? r.action : [r.action]));
    expect(actions).toContain("manage");
    expect(actions).toContain("create");
    expect(actions).toContain("delete");
  });

  it("admin cannot delete workspace", () => {
    const admin = DEFAULT_ROLES.admin;
    const deleteWorkspaceRule = admin?.rules.find(
      (r) =>
        r.resource === "Workspace" &&
        (Array.isArray(r.action) ? r.action.includes("delete") : r.action === "delete"),
    );
    expect(deleteWorkspaceRule?.inverted).toBe(true);
  });

  it("viewer is read-only", () => {
    const viewer = DEFAULT_ROLES.viewer;
    const allActions = viewer?.rules.flatMap((r) =>
      Array.isArray(r.action) ? r.action : [r.action],
    );
    const uniqueActions = [...new Set(allActions)];
    expect(uniqueActions).toEqual(["read"]);
  });

  it("guest has limited access with conditions", () => {
    const guest = DEFAULT_ROLES.guest;
    expect(guest?.rules).toHaveLength(1);
    expect(guest?.rules[0]?.conditions).toBeDefined();
    expect(guest?.rules[0]?.conditions?.guestAccess).toBe(true);
  });
});

describe("getDefaultRoles", () => {
  it("returns all roles as array", () => {
    const roles = getDefaultRoles();
    expect(roles.length).toBe(Object.keys(DEFAULT_ROLES).length);
  });
});

describe("getRoleDefinition", () => {
  it("returns definition for existing role", () => {
    const def = getRoleDefinition("owner");
    expect(def?.role).toBe("owner");
  });

  it("returns undefined for unknown role", () => {
    const def = getRoleDefinition("superadmin");
    expect(def).toBeUndefined();
  });
});

describe("getRoleHierarchy", () => {
  it("returns single role for non-inheriting roles", () => {
    const hierarchy = getRoleHierarchy("owner");
    expect(hierarchy).toEqual(["owner"]);
  });

  it("follows inheritance chain", () => {
    // member inherits viewer
    const hierarchy = getRoleHierarchy("member");
    expect(hierarchy).toContain("member");
    expect(hierarchy).toContain("viewer");
  });

  it("deduplicates inherited roles", () => {
    const hierarchy = getRoleHierarchy("member");
    const unique = [...new Set(hierarchy)];
    expect(hierarchy).toEqual(unique);
  });

  it("handles multi-level inheritance", () => {
    // admin inherits owner
    const hierarchy = getRoleHierarchy("admin");
    expect(hierarchy).toContain("admin");
    expect(hierarchy).toContain("owner");
  });

  it("returns just the role for unknown roles", () => {
    const hierarchy = getRoleHierarchy("nonexistent");
    expect(hierarchy).toEqual(["nonexistent"]);
  });
});
