// =============================================================================
// Audit Event Schema (Zod)
// =============================================================================
// Single source of truth for the structure of an audit event. Every persistence
// provider, every API gateway middleware, and every test fixture validates
// against the schemas defined here.
//
// Design goals (SOC 2 alignment):
//   - WHO   : `actor` — the principal that performed the action
//   - WHAT  : `action` + `resource` — dotted action name + the thing acted on
//   - WHEN  : `timestamp` — ISO 8601, UTC
//   - WHERE : `context.ip` + `context.geo` + `context.userAgent`
//   - TENANT: `tenantId` — every event MUST be scoped to a tenant (or "system")
//   - STATE : `changes.before` / `changes.after` for any state-mutating action
//
// The audit table itself is APPEND-ONLY — see MIGRATION.md.
// =============================================================================

import { z } from "zod";

// -----------------------------------------------------------------------------
// Primitive enums
// -----------------------------------------------------------------------------

export const ActorTypeSchema = z.enum(["user", "system", "api_key", "service"]);
export type ActorType = z.infer<typeof ActorTypeSchema>;

export const OutcomeSchema = z.enum(["success", "failure", "denied"]);
export type Outcome = z.infer<typeof OutcomeSchema>;

export const SeveritySchema = z.enum(["info", "warning", "critical"]);
export type Severity = z.infer<typeof SeveritySchema>;

// -----------------------------------------------------------------------------
// Sub-schemas
// -----------------------------------------------------------------------------

export const ActorSchema = z.object({
  id: z.string().min(1),
  type: ActorTypeSchema,
  email: z.string().email().optional(),
  name: z.string().optional(),
});
export type Actor = z.infer<typeof ActorSchema>;

export const ResourceSchema = z.object({
  type: z.string().min(1),
  id: z.string().min(1),
  name: z.string().optional(),
});
export type Resource = z.infer<typeof ResourceSchema>;

export const GeoSchema = z.object({
  country: z.string().optional(),
  region: z.string().optional(),
});
export type Geo = z.infer<typeof GeoSchema>;

export const ContextSchema = z.object({
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),
  sessionId: z.string().optional(),
  geo: GeoSchema.optional(),
});
export type Context = z.infer<typeof ContextSchema>;

export const ChangesSchema = z.object({
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
});
export type Changes = z.infer<typeof ChangesSchema>;

// -----------------------------------------------------------------------------
// Action name — dotted string with at least two segments
// e.g. "auth.login.success", "billing.subscription.created"
// -----------------------------------------------------------------------------

export const ActionSchema = z
  .string()
  .min(3)
  .regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/, {
    message:
      "Action must be lowercase, dotted, and contain at least two segments (e.g. 'billing.subscription.created').",
  });

// -----------------------------------------------------------------------------
// Full audit event
// -----------------------------------------------------------------------------

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z
    .string()
    .datetime({ offset: true })
    .or(z.date().transform((d) => d.toISOString())),
  actor: ActorSchema,
  tenantId: z.string().min(1),
  action: ActionSchema,
  resource: ResourceSchema,
  outcome: OutcomeSchema,
  severity: SeveritySchema.default("info"),
  context: ContextSchema.default({}),
  changes: ChangesSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// Input shape — `id` and `timestamp` are auto-generated when callers use the
// helper APIs but may be supplied explicitly (e.g. backfills).
export const AuditEventInputSchema = AuditEventSchema.partial({
  id: true,
  timestamp: true,
  severity: true,
  context: true,
});

export type AuditEventInput = z.input<typeof AuditEventInputSchema>;

// -----------------------------------------------------------------------------
// Query filter
// -----------------------------------------------------------------------------

export const AuditQueryFilterSchema = z.object({
  tenantId: z.string().optional(),
  actorId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  outcome: OutcomeSchema.optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().nonnegative().default(0),
});

export type AuditQueryFilter = z.input<typeof AuditQueryFilterSchema>;

// -----------------------------------------------------------------------------
// defineAction — strongly-typed action constructor
// -----------------------------------------------------------------------------

/**
 * Declare a strongly-typed audit action.
 *
 * @example
 * ```ts
 * const ROLE_CHANGED = defineAction("org.member.role_changed", z.object({
 *   oldRole: z.string(),
 *   newRole: z.string(),
 * }));
 *
 * await audit.log({
 *   action: ROLE_CHANGED.name,
 *   metadata: ROLE_CHANGED.metadata.parse({ oldRole: "member", newRole: "admin" }),
 *   ...
 * });
 * ```
 */
export function defineAction<TName extends string, TMeta extends z.ZodTypeAny = z.ZodUnknown>(
  name: TName,
  metadataSchema?: TMeta,
): { name: TName; metadata: TMeta } {
  // Validate the action name shape eagerly so misnamed actions fail at module
  // load rather than first-call.
  ActionSchema.parse(name);
  return {
    name,
    metadata: (metadataSchema ?? z.unknown()) as TMeta,
  };
}

// -----------------------------------------------------------------------------
// Canonical action catalog (extend freely, keep names stable)
// -----------------------------------------------------------------------------

export const ACTIONS = {
  AUTH_LOGIN_SUCCESS: defineAction("auth.login.success"),
  AUTH_LOGIN_FAILURE: defineAction("auth.login.failure"),
  AUTH_LOGOUT: defineAction("auth.logout"),
  ORG_MEMBER_ROLE_CHANGED: defineAction(
    "org.member.role_changed",
    z.object({ oldRole: z.string(), newRole: z.string() }),
  ),
  BILLING_CHECKOUT_STARTED: defineAction(
    "billing.checkout.started",
    z.object({ priceId: z.string(), quantity: z.number().optional() }),
  ),
  BILLING_SUBSCRIPTION_CREATED: defineAction("billing.subscription.created"),
  BILLING_SUBSCRIPTION_UPDATED: defineAction("billing.subscription.updated"),
  BILLING_SUBSCRIPTION_CANCELLED: defineAction("billing.subscription.cancelled"),
  DATA_EXPORT_REQUESTED: defineAction("data.export.requested"),
  DATA_EXPORT_COMPLETED: defineAction("data.export.completed"),
  SETTINGS_UPDATED: defineAction("settings.updated"),
  SECRET_ACCESS: defineAction("secret.access"),
  WEBHOOK_DISPATCHED: defineAction("webhook.dispatched"),
  CRON_RUN: defineAction(
    "cron.run",
    z.object({ job: z.string(), durationMs: z.number().optional() }),
  ),
  API_KEY_CREATED: defineAction("api_key.created"),
  API_KEY_REVOKED: defineAction("api_key.revoked"),
} as const;
