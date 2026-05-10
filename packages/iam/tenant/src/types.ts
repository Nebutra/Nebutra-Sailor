import { z } from "zod";

// =============================================================================
// Tenant Context & Isolation Strategy Types
// =============================================================================

/**
 * Isolation strategy determines how data is partitioned across tenants.
 *
 * - `shared_schema`: Single PostgreSQL schema with Row-Level Security (RLS) on `current_user` or `tenant_id`
 * - `schema_per_tenant`: Separate PostgreSQL schema per tenant (e.g., `org_123_public`)
 * - `database_per_tenant`: Separate PostgreSQL database per tenant (requires connection pooling)
 */
export type IsolationStrategy = "shared_schema" | "schema_per_tenant" | "database_per_tenant";

/**
 * Plan tier determines feature access and rate limits.
 */
export type PlanTier = "free" | "pro" | "enterprise";

/**
 * Runtime tenant context — available via AsyncLocalStorage in request handlers.
 */
export const TenantContextSchema = z.object({
  /** Unique tenant identifier (UUID, slug, or org ID) */
  id: z.string().min(1),

  /** Optional tenant slug for URL-friendly routing (e.g., "acme-corp") */
  slug: z.string().min(1).optional(),

  /** Subscription tier — determines feature access and limits */
  plan: z.enum(["free", "pro", "enterprise"]).optional(),

  /** Feature flags enabled for this tenant */
  features: z.array(z.string()).optional(),

  /** Rate limits and quota settings */
  limits: z.record(z.string(), z.number()).optional(),

  /** Custom metadata (arbitrary JSON) */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TenantContext = z.infer<typeof TenantContextSchema>;

/**
 * Persistent tenant information — typically loaded from database.
 */
export const TenantInfoSchema = z.object({
  /** Unique tenant ID */
  id: z.string().min(1),

  /** URL-friendly slug */
  slug: z.string().min(1),

  /** Display name */
  name: z.string().min(1),

  /** Subscription plan */
  plan: z.enum(["free", "pro", "enterprise"]),

  /** When the tenant was created */
  createdAt: z.date().or(z.string().datetime()),

  /** Tenant-specific settings (arbitrary JSON) */
  settings: z.record(z.string(), z.unknown()).default({}),

  /** For hierarchical organizations — parent org ID */
  parentTenantId: z.string().optional(),
});

export type TenantInfo = z.infer<typeof TenantInfoSchema>;

/**
 * Callback to resolve a tenant from various sources (header, subdomain, path, JWT, API key).
 *
 * Returns the resolved tenant ID or null if not found.
 */
export type TenantResolver = (req: {
  headers?: Record<string, string | string[] | undefined>;
  url?: string;
  token?: string;
  apiKey?: string;
}) => Promise<string | null> | string | null;

/**
 * Configuration for tenant extraction and isolation.
 */
export const TenantConfigSchema = z.object({
  /** Data isolation strategy */
  strategy: z
    .enum(["shared_schema", "schema_per_tenant", "database_per_tenant"])
    .default("shared_schema"),

  /** HTTP header name for tenant ID (API gateway default) */
  headerName: z.string().default("x-tenant-id"),

  /** Subdomain pattern for tenant extraction (e.g., "([a-z0-9-]+)\\.app\\.nebutra\\.com") */
  subdomainPattern: z.string().optional(),

  /** URL path prefix for tenant extraction (e.g., "/org/:tenantId") */
  pathPrefix: z.string().optional(),

  /** JWT claim name containing tenant ID */
  jwtClaimName: z.string().optional(),

  /** Whether to throw error if tenant is required but not resolved */
  requireTenant: z.boolean().default(true),
});

export type TenantConfig = z.infer<typeof TenantConfigSchema> & {
  /** Custom tenant resolver function (optional, not in zod schema) */
  resolver?: TenantResolver;
};

/**
 * Error thrown when tenant context is required but not found.
 */
export class TenantRequiredError extends Error {
  name = "TenantRequiredError";
  statusCode = 400;

  constructor(message: string = "Tenant context is required") {
    super(message);
  }
}

/**
 * Error thrown when tenant isolation fails (RLS, schema, database).
 */
export class TenantIsolationError extends Error {
  name = "TenantIsolationError";
  statusCode = 500;

  constructor(
    message: string = "Failed to apply tenant isolation",
    public strategy?: IsolationStrategy,
  ) {
    super(message);
  }
}
