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
  // Audit
  AuditLog,
  // Content
  Content,
  ContentEmbedding,
  ContentStatus,
  ContentTranslation,
  Integration,
  IntegrationType,
  Order,
  OrderItem,
  OrderStatus,
  // Multi-Tenant Core
  Organization,
  OrganizationMember,
  Plan,
  // E-Commerce
  Product,
  Role,
  // Billing
  Subscription,
  UsageLedgerEntry,
  UsageLedgerSource,
  UsageType,
  User,
  // Webhooks
  WebhookEvent,
} from "./generated/prisma/client";
export { Prisma } from "./generated/prisma/client";
