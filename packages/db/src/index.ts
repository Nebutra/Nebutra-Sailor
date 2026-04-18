// NOTE: The bare `prisma` client is no longer exported from this package.
// All Prisma access MUST go through one of:
//
//   - getTenantDb(organizationId)  — RLS-scoped for a specific tenant
//   - getSystemDb()                — ESCAPE HATCH, no tenant filter
//
// See `./client.ts` for the rationale and usage guidance.
export { getSystemDb, getTenantDb, type PrismaClient } from "./client";
// Re-export all Prisma types for convenience
export type {
  AIProvider,
  // AI Service
  AIRequest,
  AIRequestType,
  // Audit
  AuditLog,
  // Content
  Content,
  ContentEmbedding,
  ContentStatus,
  ContentTranslation,
  // Feature Flags
  FeatureFlag,
  FeatureFlagOverride,
  FeatureFlagType,
  Integration,
  IntegrationType,
  Nft,
  NftStatus,
  Order,
  OrderItem,
  OrderStatus,
  // Multi-Tenant Core
  Organization,
  OrganizationMember,
  Plan,
  // E-Commerce
  Product,
  Recommendation,
  Role,
  // Billing
  Subscription,
  TenantUsage,
  UsageAggregate,
  UsageLedgerEntry,
  UsageLedgerSource,
  UsageRecord,
  UsageType,
  User,
  // User Activity
  UserActivity,
  // Recommendation System
  UserPreference,
  // Web3
  Wallet,
  // Webhooks
  WebhookEvent,
} from "./generated/prisma/client";
export { Prisma } from "./generated/prisma/client";
