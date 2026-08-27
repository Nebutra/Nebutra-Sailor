import { describe, expect, it } from "vitest";
import type { PermissionContext, RoleDefinition } from "../types";
import { createCASLProvider } from "./casl";

const context: PermissionContext = {
  userId: "user_123",
  tenantId: "tenant_456",
  roles: ["editor"],
};

describe("CASLProvider", () => {
  it("resolves custom role inheritance from injected role definitions", () => {
    const roles: RoleDefinition[] = [
      {
        role: "base_reader",
        rules: [{ action: "read", resource: "Document" }],
      },
      {
        role: "editor",
        inherits: "base_reader",
        rules: [{ action: "update", resource: "Document" }],
      },
    ];

    const provider = createCASLProvider(roles);

    expect(provider.can(context, "read", "Document")).toBe(true);
    expect(provider.can(context, "update", "Document")).toBe(true);
  });

  it("lets child role denials override inherited grants deterministically", () => {
    const roles: RoleDefinition[] = [
      {
        role: "base_editor",
        rules: [{ action: "delete", resource: "Document" }],
      },
      {
        role: "editor",
        inherits: "base_editor",
        rules: [{ action: "delete", resource: "Document", inverted: true }],
      },
    ];

    const provider = createCASLProvider(roles);

    expect(provider.can(context, "delete", "Document")).toBe(false);
  });

  it("evaluates field-level permission rules", () => {
    const roles: RoleDefinition[] = [
      {
        role: "editor",
        rules: [{ action: "read", resource: "Document", fields: ["title", "summary"] }],
      },
    ];

    const provider = createCASLProvider(roles);

    expect(provider.can(context, "read", "Document", undefined, "title")).toBe(true);
    expect(provider.can(context, "read", "Document", undefined, "body")).toBe(false);
  });
});
