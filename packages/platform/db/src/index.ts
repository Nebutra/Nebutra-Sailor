// NOTE: The bare `prisma` client is no longer exported from this package.
// All Prisma access MUST go through one of:
//
//   - getTenantDb(tenantId)  — RLS-scoped for a specific tenant
//   - getSystemDb()                — ESCAPE HATCH, no tenant filter
//
// See `./client.ts` for the rationale and usage guidance.
export { getSystemDb, getTenantDb, type PrismaClient } from "./client";
// Re-export all Prisma types for convenience
export type {
  AIProvider,
  // Audit
  AuditLog,
  // Agent Automations
  Automation,
  AutomationRun,
  AutomationRunStatus,
  AutomationScheduleKind,
  AutomationStatus,
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
  ReasoningEffort,
  Role,
  // Billing
  Subscription,
  // BYOK — tenant-owned AI provider keys
  TenantProviderKey,
  UsageLedgerEntry,
  UsageLedgerSource,
  UsageType,
  User,
  // Agent Workflows
  WorkflowDefinition,
  WorkflowRun,
  WorkflowRunStatus,
  WorkflowStatus,
  // Webhooks
  WebhookEvent,
} from "./generated/prisma/client";
export { Prisma } from "./generated/prisma/client";
