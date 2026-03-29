export type Action =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "manage"
  | "invite"
  | "publish"
  | "export"
  | "share"
  | string;

export type Resource =
  | "Document"
  | "Project"
  | "Workspace"
  | "User"
  | "Billing"
  | "ApiKey"
  | "Team"
  | "Invite"
  | "Integration"
  | string;

export type Role = "owner" | "admin" | "member" | "viewer" | "billing_admin" | "guest" | string;

export interface PermissionRule {
  action: Action | Action[];
  resource: Resource | Resource[];
  conditions?: Record<string, unknown>;
  inverted?: boolean;
  reason?: string;
  fields?: string[];
}

export interface RoleDefinition {
  role: Role;
  inherits?: Role | Role[];
  rules: PermissionRule[];
  description?: string;
}

export interface PermissionContext {
  userId: string;
  tenantId: string;
  roles: Role[];
  attributes?: Record<string, unknown>;
}

export interface PermissionProvider {
  can(context: PermissionContext, action: Action, resource: Resource, subject?: unknown): boolean;
  cannot(
    context: PermissionContext,
    action: Action,
    resource: Resource,
    subject?: unknown,
  ): boolean;
  getRulesForRole(role: Role): PermissionRule[];
  defineRole(definition: RoleDefinition): void;
  buildAbilityFor(context: PermissionContext): unknown;
}

export type PermissionProviderType = "casl" | "openfga";

export interface PermissionConfig {
  provider?: PermissionProviderType;
  roles?: RoleDefinition[];
  openFgaApiUrl?: string;
}

export interface AbilityOptions {
  resolveAction?: boolean;
}

export class ForbiddenError extends Error {
  constructor(
    public action: Action,
    public resource: Resource,
    public context?: PermissionContext,
  ) {
    super(`Forbidden: cannot ${action} on ${resource}`);
    this.name = "ForbiddenError";
  }
}
