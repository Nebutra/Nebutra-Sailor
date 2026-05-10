import { logger } from "@nebutra/logger";
import type {
  Action,
  PermissionContext,
  PermissionProvider,
  PermissionRule,
  Resource,
  RoleDefinition,
} from "../types.js";

export interface OpenFGATuple {
  user: string;
  relation: string;
  object: string;
}

export interface OpenFGACheckRequest {
  tuple_key: {
    user: string;
    relation: string;
    object: string;
  };
}

export interface OpenFGACheckResponse {
  allowed: boolean;
}

export interface OpenFGAWriteRequest {
  writes?: {
    tuple_keys: OpenFGATuple[];
  };
  deletes?: {
    tuple_keys: OpenFGATuple[];
  };
}

export interface OpenFGAListObjectsRequest {
  user: string;
  relation: string;
  type: string;
}

export class OpenFGAProvider implements PermissionProvider {
  private apiUrl: string;
  private roleDefinitions: Map<string, RoleDefinition> = new Map();

  constructor(apiUrl?: string, roles?: RoleDefinition[]) {
    this.apiUrl = apiUrl || process.env.OPENFGA_API_URL || "http://localhost:8080";

    if (roles) {
      for (const role of roles) {
        this.roleDefinitions.set(role.role, role);
      }
    }
  }

  defineRole(definition: RoleDefinition): void {
    this.roleDefinitions.set(definition.role, definition);
  }

  getRulesForRole(role: string): PermissionRule[] {
    const definition = this.roleDefinitions.get(role);
    return definition?.rules || [];
  }

  async check(user: string, relation: string, object: string): Promise<boolean> {
    const request: OpenFGACheckRequest = {
      tuple_key: {
        user,
        relation,
        object,
      },
    };

    try {
      const response = await fetch(`${this.apiUrl}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        logger.error("OpenFGA check failed", { status: response.status, user, relation, object });
        return false;
      }

      const data: OpenFGACheckResponse = await response.json();
      return data.allowed;
    } catch (error) {
      logger.error("OpenFGA check error", { error, user, relation, object });
      return false;
    }
  }

  async write(tuples: OpenFGATuple[]): Promise<void> {
    const request: OpenFGAWriteRequest = {
      writes: {
        tuple_keys: tuples,
      },
    };

    try {
      const response = await fetch(`${this.apiUrl}/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        logger.error("OpenFGA write failed", { status: response.status });
        throw new Error(`OpenFGA write failed: ${response.statusText}`);
      }
    } catch (error) {
      logger.error("OpenFGA write error", { error });
      throw error;
    }
  }

  async delete(tuples: OpenFGATuple[]): Promise<void> {
    const request: OpenFGAWriteRequest = {
      deletes: {
        tuple_keys: tuples,
      },
    };

    try {
      const response = await fetch(`${this.apiUrl}/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        logger.error("OpenFGA delete failed", { status: response.status });
        throw new Error(`OpenFGA delete failed: ${response.statusText}`);
      }
    } catch (error) {
      logger.error("OpenFGA delete error", { error });
      throw error;
    }
  }

  async listObjects(user: string, relation: string, type: string): Promise<string[]> {
    const request: OpenFGAListObjectsRequest = {
      user,
      relation,
      type,
    };

    try {
      const response = await fetch(`${this.apiUrl}/list_objects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        logger.error("OpenFGA listObjects failed", { status: response.status });
        return [];
      }

      const data: { objects: string[] } = await response.json();
      return data.objects || [];
    } catch (error) {
      logger.error("OpenFGA listObjects error", { error });
      return [];
    }
  }

  can(
    _context: PermissionContext,
    _action: Action,
    _resource: Resource,
    _subject?: unknown,
  ): boolean {
    logger.warn(
      "OpenFGAProvider.can() is synchronous wrapper - use checkAsync() for actual checks",
    );
    return false;
  }

  cannot(
    context: PermissionContext,
    action: Action,
    resource: Resource,
    subject?: unknown,
  ): boolean {
    return !this.can(context, action, resource, subject);
  }

  async canAsync(
    context: PermissionContext,
    action: Action,
    resource: Resource,
    subject?: unknown,
  ): Promise<boolean> {
    if (typeof subject !== "string" && typeof subject !== "object") {
      return false;
    }

    const objectId = typeof subject === "string" ? subject : (subject as Record<string, string>).id;
    if (!objectId) {
      return false;
    }

    return this.check(context.userId, action, `${resource}:${objectId}`);
  }

  buildAbilityFor(_context: PermissionContext): unknown {
    return this;
  }
}

export function createOpenFGAProvider(apiUrl?: string, roles?: RoleDefinition[]): OpenFGAProvider {
  return new OpenFGAProvider(apiUrl, roles);
}
