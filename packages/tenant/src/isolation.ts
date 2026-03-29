import { logger } from "@nebutra/logger";
import type { IsolationStrategy } from "./types.js";
import { TenantIsolationError } from "./types.js";

// =============================================================================
// Database Isolation Helpers
// =============================================================================

/**
 * Apply Prisma client extension that sets RLS (Row-Level Security) context.
 *
 * Works with PostgreSQL RLS policies that check `app.current_tenant_id`.
 * This is the standard pattern for shared-schema multi-tenancy.
 *
 * The Prisma client middleware intercepts all queries and sets the
 * application-level variable before executing.
 *
 * @param prisma The Prisma client to extend
 * @param tenantId The tenant ID to set in RLS context
 * @returns The extended Prisma client
 *
 * @example
 * ```ts
 * import { PrismaClient } from "@prisma/client";
 * import { withRls } from "@nebutra/tenant/isolation";
 * import { getCurrentTenant } from "@nebutra/tenant";
 *
 * const prisma = new PrismaClient();
 *
 * // In a request handler:
 * const tenant = getCurrentTenant();
 * const client = withRls(prisma, tenant.id);
 *
 * // All queries now include RLS enforcement:
 * const users = await client.user.findMany();
 * // SQL: SELECT * FROM users WHERE current_setting('app.current_tenant_id') = user.tenant_id
 * ```
 */
export function withRls<P extends { $extends?: any; $executeRaw?: any }>(
  prisma: P,
  tenantId: string,
): P {
  try {
    // Check if Prisma client supports $extends (v5+)
    if (typeof (prisma as any).$extends === "function") {
      // Create a Prisma client extension that sets RLS context on each query
      const extended = (prisma as any).$extends({
        query: {
          $allOperations: {
            async $before() {
              // Execute SET command to set application variable
              if (typeof (prisma as any).$executeRaw === "function") {
                await (prisma as any)
                  .$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`;
              }
              logger.debug("RLS context set", { tenantId });
            },
          },
        },
      });

      return extended as P;
    }

    logger.debug("withRls: Prisma client does not support $extends, returning original client", {
      tenantId,
    });
    return prisma;
  } catch (err) {
    logger.error("Failed to apply RLS extension", err, { tenantId });
    throw new TenantIsolationError(
      `Failed to apply RLS isolation for tenant ${tenantId}`,
      "shared_schema",
    );
  }
}

/**
 * Get the PostgreSQL schema name for schema-per-tenant strategy.
 *
 * Converts a tenant ID to a safe PostgreSQL schema name.
 * Schema names must start with a letter and contain only alphanumerics and underscores.
 *
 * @param tenantId The tenant ID
 * @returns The schema name (e.g., "org_acme_corp_public")
 * @throws TenantIsolationError if tenant ID is invalid
 *
 * @example
 * ```ts
 * const schemaName = getTenantSchema("acme-corp");
 * // Returns: "org_acme_corp_public"
 * ```
 */
export function getTenantSchema(tenantId: string): string {
  if (!tenantId || typeof tenantId !== "string") {
    throw new TenantIsolationError("Invalid tenant ID for schema generation", "schema_per_tenant");
  }

  // Convert tenant ID to safe schema name
  // Replace hyphens and special chars with underscores
  const safe = tenantId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^[0-9]+/, "org_");

  // Ensure doesn't conflict with reserved schemas
  const reserved = ["public", "pg_", "information_schema", "pg_catalog"];
  if (reserved.some((r) => safe.startsWith(r))) {
    return `org_${safe}`;
  }

  return `${safe}_public`;
}

/**
 * Get the PostgreSQL connection string for database-per-tenant strategy.
 *
 * Constructs a connection URL with the tenant-specific database name.
 * Assumes the base connection URL is available and tenant databases follow
 * a naming pattern (e.g., `nebutra_acme_corp`).
 *
 * @param tenantId The tenant ID
 * @param baseUrl Optional base connection URL (defaults to process.env.DATABASE_URL)
 * @returns The tenant-specific database URL
 * @throws TenantIsolationError if base URL is invalid
 *
 * @example
 * ```ts
 * const dbUrl = getTenantDatabaseUrl("acme-corp");
 * // Returns: "postgresql://user:pass@localhost/nebutra_acme_corp"
 * ```
 */
export function getTenantDatabaseUrl(tenantId: string, baseUrl?: string): string {
  const url = baseUrl || process.env.DATABASE_URL;

  if (!url) {
    throw new TenantIsolationError(
      "No base database URL available for tenant database resolution",
      "database_per_tenant",
    );
  }

  try {
    const parsedUrl = new URL(url);

    // Convert tenant ID to safe database name
    const dbName = `nebutra_${tenantId.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

    // Replace pathname (database name)
    parsedUrl.pathname = `/${dbName}`;

    logger.debug("Tenant database URL constructed", { tenantId, dbName });

    return parsedUrl.toString();
  } catch (err) {
    logger.error("Failed to construct tenant database URL", err, { tenantId });
    throw new TenantIsolationError(
      `Failed to construct database URL for tenant ${tenantId}`,
      "database_per_tenant",
    );
  }
}

/**
 * Wrapper for a Prisma client that automatically applies tenant filtering.
 *
 * This is useful for schema-per-tenant or database-per-tenant strategies
 * where you want to ensure tenant isolation at the client level.
 *
 * @example
 * ```ts
 * import { TenantAwarePrismaClient } from "@nebutra/tenant/isolation";
 * import { getCurrentTenant } from "@nebutra/tenant";
 *
 * export function getTenantPrisma() {
 *   const tenant = getCurrentTenant();
 *   return new TenantAwarePrismaClient(prisma, tenant.id);
 * }
 * ```
 */
export class TenantAwarePrismaClient {
  constructor(
    private prisma: any,
    private tenantId: string,
  ) {
    logger.debug("TenantAwarePrismaClient initialized", { tenantId });
  }

  /**
   * Get the underlying Prisma client with RLS context applied.
   */
  get client() {
    return withRls(this.prisma, this.tenantId);
  }

  /**
   * Get the schema name for this tenant (schema-per-tenant strategy).
   */
  getSchema(): string {
    return getTenantSchema(this.tenantId);
  }

  /**
   * Get the database URL for this tenant (database-per-tenant strategy).
   */
  getDatabaseUrl(baseUrl?: string): string {
    return getTenantDatabaseUrl(this.tenantId, baseUrl);
  }

  /**
   * Execute a raw SQL query with tenant context.
   */
  async executeRaw(query: string): Promise<any> {
    try {
      logger.debug("Executing raw query with tenant context", {
        tenantId: this.tenantId,
        queryLength: query.length,
      });

      return await (this.client as any).$executeRaw`${query}`;
    } catch (err) {
      logger.error("Failed to execute raw query", err, { tenantId: this.tenantId });
      throw new TenantIsolationError(
        `Failed to execute query for tenant ${this.tenantId}`,
        "shared_schema",
      );
    }
  }

  /**
   * Execute a raw query and return results.
   */
  async queryRaw(query: string): Promise<any[]> {
    try {
      logger.debug("Executing query with tenant context", {
        tenantId: this.tenantId,
        queryLength: query.length,
      });

      return await (this.client as any).$queryRaw`${query}`;
    } catch (err) {
      logger.error("Failed to execute query", err, { tenantId: this.tenantId });
      throw new TenantIsolationError(
        `Failed to query tenant data for ${this.tenantId}`,
        "shared_schema",
      );
    }
  }
}

/**
 * Create a tenant-aware Prisma proxy that applies isolation based on strategy.
 *
 * @param prisma The base Prisma client
 * @param tenantId The tenant ID
 * @param strategy The isolation strategy (default: "shared_schema")
 * @returns A proxy or wrapper for the Prisma client
 *
 * @example
 * ```ts
 * const prisma = createTenantPrismaProxy(client, "acme-corp", "shared_schema");
 * const users = await prisma.user.findMany(); // Filtered by RLS
 * ```
 */
export function createTenantPrismaProxy(
  prisma: any,
  tenantId: string,
  strategy: IsolationStrategy = "shared_schema",
): any {
  logger.debug("Creating tenant Prisma proxy", { tenantId, strategy });

  switch (strategy) {
    case "shared_schema":
      // Apply RLS extension
      return withRls(prisma, tenantId);

    case "schema_per_tenant":
      // Wrap with schema awareness
      return new TenantAwarePrismaClient(prisma, tenantId).client;

    case "database_per_tenant":
      // Wrap with database URL awareness
      return new TenantAwarePrismaClient(prisma, tenantId).client;

    default:
      throw new TenantIsolationError(`Unknown isolation strategy: ${strategy}`);
  }
}
