import type { RoleDefinition } from "./types.js";

export const DEFAULT_ROLES: Record<string, RoleDefinition> = {
  owner: {
    role: "owner",
    description: "Full control over workspace and all resources",
    rules: [
      {
        action: [
          "create",
          "read",
          "update",
          "delete",
          "manage",
          "invite",
          "publish",
          "export",
          "share",
        ],
        resource: [
          "Document",
          "Project",
          "Workspace",
          "User",
          "Billing",
          "ApiKey",
          "Team",
          "Invite",
          "Integration",
        ],
      },
    ],
  },

  admin: {
    role: "admin",
    inherits: "owner",
    description: "Administrative access except billing transfer and workspace deletion",
    rules: [
      {
        action: [
          "create",
          "read",
          "update",
          "delete",
          "manage",
          "invite",
          "publish",
          "export",
          "share",
        ],
        resource: ["Document", "Project", "User", "ApiKey", "Team", "Invite", "Integration"],
      },
      {
        action: ["read", "update"],
        resource: "Billing",
        conditions: { scope: "read-only" },
      },
      {
        action: ["delete"],
        resource: "Workspace",
        inverted: true,
        reason: "Admins cannot delete the workspace",
      },
    ],
  },

  member: {
    role: "member",
    inherits: "viewer",
    description: "CRUD own resources, read shared resources",
    rules: [
      {
        action: ["create", "read", "update", "delete"],
        resource: ["Document", "Project"],
        conditions: { createdBy: "${user.userId}" },
      },
      {
        action: ["read", "update"],
        resource: ["Document", "Project"],
        conditions: { sharedWith: "${user.userId}" },
      },
      {
        action: ["read"],
        resource: ["User", "Team"],
      },
      {
        action: ["create", "read"],
        resource: "ApiKey",
        conditions: { owner: "${user.userId}" },
      },
      {
        action: ["update", "delete"],
        resource: "ApiKey",
        conditions: { owner: "${user.userId}" },
      },
      {
        action: ["invite"],
        resource: "User",
      },
    ],
  },

  viewer: {
    role: "viewer",
    description: "Read-only access to shared resources",
    rules: [
      {
        action: ["read"],
        resource: ["Document", "Project", "User", "Team"],
        conditions: { visibility: "public" },
      },
      {
        action: ["read"],
        resource: ["Document", "Project"],
        conditions: { sharedWith: "${user.userId}" },
      },
    ],
  },

  billing_admin: {
    role: "billing_admin",
    inherits: "viewer",
    description: "Manage billing and subscription",
    rules: [
      {
        action: ["create", "read", "update"],
        resource: "Billing",
      },
      {
        action: ["read"],
        resource: "Workspace",
      },
    ],
  },

  guest: {
    role: "guest",
    description: "Limited read access to specific shared resources only",
    rules: [
      {
        action: ["read"],
        resource: ["Document", "Project"],
        conditions: { sharedWith: "${user.userId}", guestAccess: true },
      },
    ],
  },
};

export function getDefaultRoles(): RoleDefinition[] {
  return Object.values(DEFAULT_ROLES);
}

export function getRoleDefinition(role: string): RoleDefinition | undefined {
  return DEFAULT_ROLES[role];
}

export function getRoleHierarchy(role: string): string[] {
  const hierarchy: string[] = [role];
  const definition = getRoleDefinition(role);

  if (definition?.inherits) {
    const inherits = Array.isArray(definition.inherits)
      ? definition.inherits
      : [definition.inherits];
    for (const inherited of inherits) {
      hierarchy.push(...getRoleHierarchy(inherited));
    }
  }

  return [...new Set(hierarchy)];
}
