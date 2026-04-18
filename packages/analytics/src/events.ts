/**
 * Typed event contracts for product analytics.
 *
 * Every event emitted via `@nebutra/analytics` must match one of the schemas
 * in `EVENT_SCHEMAS`. Zod validates runtime payloads and derives compile-time
 * types — a single source of truth for both.
 *
 * These contracts are LOCKED per ADR §10 Q1. Add new events by extending
 * `EVENT_SCHEMAS`; never change existing field names or enum values without
 * a version bump.
 */
import { z } from "zod";

/**
 * Base properties accepted (and all optional) on every event.
 * Identity / session context is injected by callers when available.
 */
export const BaseEventProps = z.object({
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  sessionId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export const ScaffoldCompletedEvent = BaseEventProps.extend({
  template_version: z.string(),
  package_manager: z.enum(["npm", "pnpm", "yarn", "bun"]),
  region: z.enum(["global", "cn", "hybrid"]),
  auth: z.string(),
  payment: z.string(),
  ai_providers: z.array(z.string()),
  deploy_target: z.string(),
  duration_ms: z.number(),
});

export const LicenseWizardEvent = BaseEventProps.extend({
  step: z.enum(["started", "step_completed", "submitted", "failed"]),
  step_name: z.string().optional(),
  tier: z.enum(["INDIVIDUAL", "OPC", "STARTUP", "ENTERPRISE"]).optional(),
  error_code: z.string().optional(),
});

export const LicenseCliEvent = BaseEventProps.extend({
  action: z.enum(["activate_attempted", "activated", "failed"]),
  license_tier: z.string().optional(),
  cli_version: z.string(),
  error_code: z.string().optional(),
});

export const SleptonsEvent = BaseEventProps.extend({
  action: z.enum([
    "profile_viewed",
    "showcase_posted",
    "ideas_voted",
    "connection_made",
  ]),
  target_user_id: z.string().optional(),
  showcase_id: z.string().optional(),
  idea_id: z.string().optional(),
});

export const DocsSearchEvent = BaseEventProps.extend({
  query: z.string(),
  result_count: z.number(),
  clicked_result_position: z.number().optional(),
});

export const CheckoutEvent = BaseEventProps.extend({
  action: z.enum(["started", "completed", "abandoned"]),
  tier: z.string(),
  amount_cents: z.number().optional(),
  currency: z.string().optional(),
  payment_method: z.string().optional(),
});

export type EventName =
  | "scaffold.completed"
  | "license.wizard"
  | "license.cli"
  | "sleptons"
  | "docs.search_query"
  | "checkout";

export const EVENT_SCHEMAS = {
  "scaffold.completed": ScaffoldCompletedEvent,
  "license.wizard": LicenseWizardEvent,
  "license.cli": LicenseCliEvent,
  sleptons: SleptonsEvent,
  "docs.search_query": DocsSearchEvent,
  checkout: CheckoutEvent,
} as const satisfies Record<EventName, z.ZodTypeAny>;

// Inferred types — exported for downstream type-safe handlers.
export type ScaffoldCompletedPayload = z.infer<typeof ScaffoldCompletedEvent>;
export type LicenseWizardPayload = z.infer<typeof LicenseWizardEvent>;
export type LicenseCliPayload = z.infer<typeof LicenseCliEvent>;
export type SleptonsPayload = z.infer<typeof SleptonsEvent>;
export type DocsSearchPayload = z.infer<typeof DocsSearchEvent>;
export type CheckoutPayload = z.infer<typeof CheckoutEvent>;

export type EventPayload<E extends EventName> = z.infer<
  (typeof EVENT_SCHEMAS)[E]
>;
