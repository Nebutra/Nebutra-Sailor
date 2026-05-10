// =============================================================================
// @nebutra/tenant — Multi-tenancy context and isolation
// =============================================================================

// Re-export context functions
export {
  getCurrentTenant,
  getCurrentTenantId,
  getTenantIdOrNull,
  getTenantOrNull,
  requireTenant,
  runWithTenant,
} from "./context";
// Re-export resolvers
export {
  compose,
  fromApiKey,
  fromHeader,
  fromJwtClaim,
  fromPath,
  fromSubdomain,
} from "./resolvers";
// Re-export types
export type {
  IsolationStrategy,
  PlanTier,
  TenantConfig,
  TenantContext,
  TenantInfo,
  TenantResolver,
} from "./types";
export {
  TenantConfigSchema,
  TenantContextSchema,
  TenantInfoSchema,
  TenantIsolationError,
  TenantRequiredError,
} from "./types";

// Re-export middleware (as subpath export ./middleware)
// These are exported via package.json "exports" for tree-shaking

export type { RlsPolicyCommand, RlsPolicySqlOptions } from "./isolation";
// Re-export isolation helpers
export {
  createTenantPrismaProxy,
  generateRlsPolicySql,
  getTenantDatabaseUrl,
  getTenantSchema,
  TenantAwarePrismaClient,
  withRls,
} from "./isolation";

// Re-export React hooks (as subpath export ./react)
// These are exported via package.json "exports" for tree-shaking
