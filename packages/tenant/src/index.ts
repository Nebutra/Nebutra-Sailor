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
} from "./context.js";
// Re-export resolvers
export {
  compose,
  fromApiKey,
  fromHeader,
  fromJwtClaim,
  fromPath,
  fromSubdomain,
} from "./resolvers.js";
// Re-export types
export type {
  IsolationStrategy,
  PlanTier,
  TenantConfig,
  TenantContext,
  TenantInfo,
  TenantResolver,
} from "./types.js";
export {
  TenantConfigSchema,
  TenantContextSchema,
  TenantInfoSchema,
  TenantIsolationError,
  TenantRequiredError,
} from "./types.js";

// Re-export middleware (as subpath export ./middleware)
// These are exported via package.json "exports" for tree-shaking

// Re-export isolation helpers
export {
  createTenantPrismaProxy,
  getTenantDatabaseUrl,
  getTenantSchema,
  TenantAwarePrismaClient,
  withRls,
} from "./isolation.js";

// Re-export React hooks (as subpath export ./react)
// These are exported via package.json "exports" for tree-shaking
