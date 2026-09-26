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
} as const;

// Export individual schemas for direct use in validation
export { GdprDeletionRequestDataSchema, StripeInvoiceDataSchema, StripeSubscriptionDataSchema };

export type StripeSubscriptionData = z.infer<typeof StripeSubscriptionDataSchema>;
export type StripeInvoiceData = z.infer<typeof StripeInvoiceDataSchema>;
