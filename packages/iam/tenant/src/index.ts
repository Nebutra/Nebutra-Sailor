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
export type { AuthSessionLike, SessionGetter } from "./resolvers/from-auth-session.js";
export { fromAuthSession } from "./resolvers/from-auth-session.js";
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

export type {
  RlsPolicyCommand,
  RlsPolicySqlOptions,
  TenantSessionExecutor,
  TenantSessionOptions,
} from "./isolation.js";
// Re-export isolation helpers — including the tenant session core shared with
// `@nebutra/db/rls` (closure P1.2: one implementation behind both wrappers).
export {
  applyTenantSession,
  createTenantPrismaProxy,
  generateRlsPolicySql,
  getTenantDatabaseUrl,
  getTenantSchema,
  isValidDbRole,
  resolveRlsRole,
  TENANT_SESSION_EXPRESSION,
  TENANT_SESSION_SETTING,
  TenantAwarePrismaClient,
  tenantSessionOperations,
  withRls,
} from "./isolation.js";

// Re-export React hooks (as subpath export ./react)
// These are exported via package.json "exports" for tree-shaking
