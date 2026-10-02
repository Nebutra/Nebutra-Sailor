/**
 * Zod schemas for all Inngest event payloads.
 *
 * These schemas serve as the single source of truth for the structure of
 * events that flow through the Nebutra platform:
 *   - Stripe webhook events (stripe/*)
 *   - Internal domain events (nebutra/*)
 *
 * Usage — type-safe Inngest client:
 *   import { Inngest, EventSchemas } from "inngest";
 *   import { inngestSchemas } from "@nebutra/event-bus/schemas";
 *
 *   export const inngest = new Inngest({
 *     id: "my-service",
 *     schemas: new EventSchemas().fromZod(inngestSchemas),
 *   });
 */

import { z } from "zod";

// ── Stripe webhook payloads ───────────────────────────────────────────────────

const StripeSubscriptionDataSchema = z.object({
  organizationId: z.string(),
  subscriptionId: z.string(),
  customerId: z.string(),
  status: z.enum([
    "active",
    "trialing",
    "canceled",
    "unpaid",
    "past_due",
    "paused",
    "incomplete",
    "incomplete_expired",
  ]),
  priceId: z.string().optional(),
  planId: z.string().optional(),
});

const StripeInvoiceDataSchema = z.object({
  organizationId: z.string().optional(),
  invoiceId: z.string(),
  customerId: z.string(),
  amountPaid: z.number().optional(),
  currency: z.string().optional(),
  failureReason: z.string().optional(),
});

// ── Nebutra internal domain events ───────────────────────────────────────────

const GdprDeletionRequestDataSchema = z.object({
  userId: z.string(),
  organizationIds: z.array(z.string()),
  requestedAt: z.string().datetime(),
});

// ── Supply capability probing — event-driven execution (ADR 2026-09-30,
// "Event-driven execution" addendum) ────────────────────────────────────────
//
// Replaces the synchronous "probe every model in one HTTP request" path (the
// 2026-09-30 incident's root cause — an 86-model source's "probe now" hit a
// Cloudflare 524) with durable, fanned-out Inngest steps. Router never calls
// Inngest directly (no `INNGEST_EVENT_KEY` on Router's own process — only the
// gateway holds one); it posts to the gateway's `/api/internal/v1/supply`
// relay instead (`apps/router/src/lib/supply/events.ts`), authenticated with
// the same zero-context service token `internal-service.ts` already mints for
// "Nebutra infrastructure calling itself" — zero new secret.

/** A source was added, its credential changed, or it was (re)enabled. */
const SupplySourceChangedDataSchema = z.object({
  sourceKey: z.string(),
  reason: z.enum(["added", "credential_changed", "enabled", "scheduled"]),
});

/** Discovery found models newly present (added or reappeared) on a source. */
const SupplyModelDiscoveredDataSchema = z.object({
  sourceKey: z.string(),
  upstreamModels: z.array(z.string()).min(1),
});

/**
 * A passive signal worth a targeted re-probe. `upstreamModel` is omitted for
 * a source-level signal (quota threshold crossings aren't about one model).
 */
const SupplyModelSignalDataSchema = z.object({
  sourceKey: z.string(),
  upstreamModel: z.string().optional(),
  kind: z.enum(["error_spike", "rate_limited", "quota_threshold"]),
  reason: z.string().optional(),
});

/**
 * Admin "probe now". `upstreamModels` omitted means "every current model for
 * this source" — the fan-out function discovers first, then probes each
 * found model as its own step (never as one loop inside one HTTP request).
 */
const SupplyProbeRequestedDataSchema = z.object({
  sourceKey: z.string().optional(),
  upstreamModels: z.array(z.string()).optional(),
  runId: z.string(),
});

/** Fired once, on deploy/first boot, when the supply registry has never been seeded. */
const SupplyBootstrapDataSchema = z.object({
  sourceKeys: z.array(z.string()),
  triggeredAt: z.string().datetime(),
});

// ── Combined schema map for Inngest EventSchemas.fromZod() ───────────────────

export const inngestSchemas = {
  // Stripe events
  "stripe/subscription.updated": { data: StripeSubscriptionDataSchema },
  "stripe/subscription.deleted": { data: StripeSubscriptionDataSchema },
  "stripe/invoice.paid": { data: StripeInvoiceDataSchema },
  "stripe/invoice.payment_failed": { data: StripeInvoiceDataSchema },

  // Internal platform events
  "nebutra/gdpr.deletion_requested": { data: GdprDeletionRequestDataSchema },
  "nebutra/gdpr.deletion_completed": { data: GdprDeletionRequestDataSchema },

  // Supply capability probing — event-driven execution
  "supply/source.changed": { data: SupplySourceChangedDataSchema },
  "supply/model.discovered": { data: SupplyModelDiscoveredDataSchema },
  "supply/model.signal": { data: SupplyModelSignalDataSchema },
  "supply/probe.requested": { data: SupplyProbeRequestedDataSchema },
  "supply/bootstrap": { data: SupplyBootstrapDataSchema },
} as const;

// Export individual schemas for direct use in validation
export {
  GdprDeletionRequestDataSchema,
  StripeInvoiceDataSchema,
  StripeSubscriptionDataSchema,
  SupplyBootstrapDataSchema,
  SupplyModelDiscoveredDataSchema,
  SupplyModelSignalDataSchema,
  SupplyProbeRequestedDataSchema,
  SupplySourceChangedDataSchema,
};

export type StripeSubscriptionData = z.infer<typeof StripeSubscriptionDataSchema>;
export type StripeInvoiceData = z.infer<typeof StripeInvoiceDataSchema>;
export type SupplySourceChangedData = z.infer<typeof SupplySourceChangedDataSchema>;
export type SupplyModelDiscoveredData = z.infer<typeof SupplyModelDiscoveredDataSchema>;
export type SupplyModelSignalData = z.infer<typeof SupplyModelSignalDataSchema>;
export type SupplyProbeRequestedData = z.infer<typeof SupplyProbeRequestedDataSchema>;
export type SupplyBootstrapData = z.infer<typeof SupplyBootstrapDataSchema>;
