import {
  type Ability,
  AbilityBuilder,
  subject as caslSubject,
  createMongoAbility,
} from "@casl/ability";
import { accessibleBy, type PrismaQuery } from "@casl/prisma";
import { getDefaultRoles } from "../roles.js";
import type {
  Action,
  PermissionContext,
  PermissionProvider,
  PermissionRule,
  Resource,
  RoleDefinition,
} from "../types.js";

type AppAbility = Ability<[Action, Resource]>;

export class CASLProvider implements PermissionProvider {
  private abilities: Map<string, AppAbility> = new Map();
  private roleDefinitions: Map<string, RoleDefinition> = new Map();

  constructor(roles?: RoleDefinition[]) {
    const defaultRoles = getDefaultRoles();
    const allRoles = [...defaultRoles, ...(roles || [])];

    for (const role of allRoles) {
      this.roleDefinitions.set(role.role, role);
    }
  }

  defineRole(definition: RoleDefinition): void {
    this.roleDefinitions.set(definition.role, definition);
    this.clearCache();
  }

  getRulesForRole(role: string): PermissionRule[] {
    const hierarchy = this.getRoleHierarchy(role);
    const rules: PermissionRule[] = [];

    for (const roleInHierarchy of hierarchy) {
      const definition = this.roleDefinitions.get(roleInHierarchy);
      if (definition) {
        rules.push(...definition.rules);
      }
    }

    return rules;
  }

  buildAbilityFor(context: PermissionContext): AppAbility {
    const cacheKey = this.getCacheKey(context);
    const cached = this.abilities.get(cacheKey);
    if (cached) {
      return cached;
    }

    const builder = new AbilityBuilder<AppAbility>(createMongoAbility);
    const rules = this.collectRulesForContext(context);

    for (const rule of rules) {
      this.applyRule(builder, rule, context);
    }

    const ability = builder.build();
    this.abilities.set(cacheKey, ability);
    return ability;
  }

  can(
    context: PermissionContext,
    action: Action,
    resource: Resource,
    subject?: unknown,
    field?: string,
  ): boolean {
    const ability = this.buildAbilityFor(context);
    return ability.can(action, this.resolveSubject(resource, subject) as Resource, field);
  }

  cannot(
    context: PermissionContext,
    action: Action,
    resource: Resource,
    subject?: unknown,
    field?: string,
  ): boolean {
    const ability = this.buildAbilityFor(context);
    return ability.cannot(action, this.resolveSubject(resource, subject) as Resource, field);
  }

  private collectRulesForContext(context: PermissionContext): PermissionRule[] {
    const rules: PermissionRule[] = [];

    for (const role of context.roles) {
      const roleRules = this.getRulesForRole(role);
      rules.push(...roleRules);
    }

    return rules;
  }

  private applyRule(
    builder: AbilityBuilder<AppAbility>,
    rule: PermissionRule,
    context: PermissionContext,
  ): void {
    const { can, cannot } = builder;
    const actions = Array.isArray(rule.action) ? rule.action : [rule.action];
    const resources = Array.isArray(rule.resource) ? rule.resource : [rule.resource];

    const conditions = rule.conditions
      ? this.resolveConditions(rule.conditions, context)
      : undefined;

    const method = rule.inverted ? cannot : can;

    for (const action of actions) {
      for (const resource of resources) {
        const args = [action, resource] as unknown[];
        if (rule.fields) {
          args.push(rule.fields);
        }
        if (conditions) {
          args.push(conditions);
        }

        method.apply(builder, args as never);
      }
    }
  }

  private getRoleHierarchy(role: string, visited: Set<string> = new Set()): string[] {
    if (visited.has(role)) {
      return [];
    }

    visited.add(role);

    const definition = this.roleDefinitions.get(role);
    const inherits = definition?.inherits
      ? Array.isArray(definition.inherits)
        ? definition.inherits
        : [definition.inherits]
      : [];

    const hierarchy: string[] = [];
    for (const inherited of inherits) {
      hierarchy.push(...this.getRoleHierarchy(inherited, visited));
    }
    hierarchy.push(role);

    return [...new Set(hierarchy)];
  }

  private resolveConditions(
    conditions: Record<string, unknown>,
    context: PermissionContext,
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(conditions)) {
      if (typeof value === "string" && value.startsWith("${") && value.endsWith("}")) {
        const path = value.slice(2, -1);
        resolved[key] = this.resolvePath(path, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  private resolvePath(path: string, context: PermissionContext): unknown {
    const parts = path.split(".");
    let current: unknown = context;

    for (const part of parts) {
      if (typeof current === "object" && current !== null) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private resolveSubject(
    resource: Resource,
    subject: unknown,
  ): Resource | ReturnType<typeof caslSubject> {
    if (subject && typeof subject === "object") {
      return caslSubject(resource, subject as Record<string, unknown>);
    }

    return resource;
  }

  private getCacheKey(context: PermissionContext): string {
    return `${context.userId}:${context.tenantId}:${[...context.roles].sort().join(",")}`;
  }

  clearCache(): void {
    this.abilities.clear();
  }
}

export function createCASLProvider(roles?: RoleDefinition[]): CASLProvider {
  return new CASLProvider(roles);
}

export function buildAbilityFor(context: PermissionContext, roles?: RoleDefinition[]): AppAbility {
  const provider = new CASLProvider(roles);
  return provider.buildAbilityFor(context);
}

export function createPrismaAbility(
  context: PermissionContext,
  roles?: RoleDefinition[],
): AppAbility {
  return buildAbilityFor(context, roles);
}

export function getPrismaQuery(
  ability: AppAbility,
  action: Action,
  resource: Resource,
): PrismaQuery {
  const prismaAbility = ability as unknown as Parameters<typeof accessibleBy>[0];
  const queryByResource = accessibleBy(prismaAbility, action) as unknown as Record<
    string,
    PrismaQuery
  >;
  return queryByResource[resource] || {};
}
