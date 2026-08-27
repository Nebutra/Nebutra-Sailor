import { logger } from "@nebutra/logger";
import type {
  Action,
  PermissionContext,
  PermissionProvider,
  PermissionRule,
  Resource,
  RoleDefinition,
} from "../types";

export interface OpenFGATuple {
  user: string;
  relation: string;
  object: string;
}

export interface OpenFGAProviderConfig {
  apiUrl?: string | undefined;
  storeId?: string | undefined;
  authToken?: string | undefined;
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
  private storeId: string | undefined;
  private authToken: string | undefined;
  private roleDefinitions: Map<string, RoleDefinition> = new Map();

  constructor(config?: string | OpenFGAProviderConfig, roles?: RoleDefinition[]) {
    const resolvedConfig = typeof config === "string" ? { apiUrl: config } : config;

    this.apiUrl = resolvedConfig?.apiUrl || process.env.OPENFGA_API_URL || "http://localhost:8080";
    const resolvedStoreId = resolvedConfig?.storeId || process.env.OPENFGA_STORE_ID;
    if (resolvedStoreId !== undefined) this.storeId = resolvedStoreId;
    const resolvedAuthToken = resolvedConfig?.authToken || process.env.OPENFGA_AUTH_TOKEN;
    if (resolvedAuthToken !== undefined) this.authToken = resolvedAuthToken;

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

  private endpoint(path: "check" | "list-objects" | "write"): string | null {
    if (!this.storeId) {
      logger.error("OpenFGA store id is required", { path });
      return null;
    }

    const apiUrl = this.apiUrl.replace(/\/+$/, "");
    const storeId = encodeURIComponent(this.storeId);
    return `${apiUrl}/stores/${storeId}/${path}`;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  async check(user: string, relation: string, object: string): Promise<boolean> {
    const request: OpenFGACheckRequest = {
      tuple_key: {
        object,
        relation,
        user,
      },
    };
    const endpoint = this.endpoint("check");

    if (!endpoint) {
      return false;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        logger.error("OpenFGA check failed", { status: response.status, user, relation, object });
        return false;
      }

      const data: OpenFGACheckResponse = await response.json();
      return data.allowed === true;
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
    const endpoint = this.endpoint("write");

    if (!endpoint) {
      throw new Error("OpenFGA write failed: missing store id");
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: this.headers(),
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
    const endpoint = this.endpoint("write");

    if (!endpoint) {
      throw new Error("OpenFGA delete failed: missing store id");
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: this.headers(),
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
      relation,
      type,
      user,
    };
    const endpoint = this.endpoint("list-objects");

    if (!endpoint) {
      return [];
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: this.headers(),
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
    const user = this.formatUser(context.userId);
    const object = this.formatObject(resource, subject);

    if (!user || !object) {
      return false;
    }

    return this.check(user, action, object);
  }

  private formatUser(userId: string): string | null {
    const trimmed = userId.trim();

    if (!trimmed) {
      return null;
    }

    return trimmed.includes(":") ? trimmed : `user:${trimmed}`;
  }

  private formatObject(resource: Resource, subject: unknown): string | null {
    const objectId = this.extractSubjectId(subject);

    if (!objectId) {
      return null;
    }

    if (objectId.includes(":")) {
      return objectId;
    }

    const objectType = String(resource).trim();

    if (!objectType) {
      return null;
    }

    return `${objectType}:${objectId}`;
  }

  private extractSubjectId(subject: unknown): string | null {
    if (typeof subject === "string") {
      const trimmed = subject.trim();
      return trimmed || null;
    }

    if (subject === null || typeof subject !== "object" || Array.isArray(subject)) {
      return null;
    }

    const id = (subject as { id?: unknown }).id;

    if (typeof id !== "string") {
      return null;
    }

    const trimmed = id.trim();
    return trimmed || null;
  }

  buildAbilityFor(_context: PermissionContext): unknown {
    return this;
  }
}

export function createOpenFGAProvider(
  config?: string | OpenFGAProviderConfig,
  roles?: RoleDefinition[],
): OpenFGAProvider {
  return new OpenFGAProvider(config, roles);
}
