// NOTE: The bare `prisma` client is no longer exported from this package.
// All Prisma access MUST go through one of:
//
//   - getTenantDb(tenantId)  — RLS-scoped for a specific tenant
//   - getSystemDb()                — ESCAPE HATCH, no tenant filter
//
// See `./client.ts` for the rationale and usage guidance.

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
  // Pebble support intake (not tenant-scoped — anonymous desktop clients)
  PebbleDiagnosticStatus,
  PebbleDiagnosticTicket,
  PebbleFeedback,
  PebbleFeedbackKind,
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
  WaitlistEntry,
  // Webhooks
  WebhookEvent,
  // Agent Workflows
  WorkflowDefinition,
  WorkflowRun,
  WorkflowRunStatus,
  WorkflowStatus,
} from "#prisma-client";
// Runtime export, not a type — a direct path here bakes the Node client into
// the Workers bundle even though nothing on that path is used there. Goes
// through the "#prisma-client" condition like the client itself.
export { Prisma } from "#prisma-client";
export { getSystemDb, getTenantDb, type PrismaClient } from "./client";
