import { type Ability, AbilityBuilder, createMongoAbility } from "@casl/ability";
import { accessibleBy, type PrismaQuery } from "@casl/prisma";
import { getDefaultRoles, getRoleHierarchy } from "../roles.js";
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
    const allRoles = [...(roles || []), ...defaultRoles];

    for (const role of allRoles) {
      this.roleDefinitions.set(role.role, role);
    }
  }

  defineRole(definition: RoleDefinition): void {
    this.roleDefinitions.set(definition.role, definition);
  }

  getRulesForRole(role: string): PermissionRule[] {
    const hierarchy = getRoleHierarchy(role);
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

  can(context: PermissionContext, action: Action, resource: Resource, subject?: unknown): boolean {
    const ability = this.buildAbilityFor(context);
    return ability.can(action, resource, subject as string | undefined);
  }

  cannot(
    context: PermissionContext,
    action: Action,
    resource: Resource,
    subject?: unknown,
  ): boolean {
    const ability = this.buildAbilityFor(context);
    return ability.cannot(action, resource, subject as string | undefined);
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
        if (conditions) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          method.apply(builder, [action, resource, conditions as any]);
        } else {
          method.apply(builder, [action, resource]);
        }
      }
    }
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

  private getCacheKey(context: PermissionContext): string {
    return `${context.userId}:${context.tenantId}:${context.roles.sort().join(",")}`;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (accessibleBy(ability as any, action) as any)[resource] || {};
}
