/**
 * Zod schemas for all Inngest event payloads.
 *
 * These schemas serve as the single source of truth for the structure of
 * events that flow through the Nebutra platform:
 *   - Clerk webhook events  (clerk/*)
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

// ── Clerk webhook payloads ────────────────────────────────────────────────────

const ClerkUserDataSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

const ClerkOrganizationDataSchema = z.object({
  organizationId: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  createdById: z.string().optional(),
  plan: z.string().optional(),
});

const ClerkMembershipDataSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
  role: z.string(),
});

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

const TenantProvisionedDataSchema = z.object({
  organizationId: z.string(),
  organizationClerkId: z.string(),
  organizationName: z.string(),
  ownerEmail: z.string().optional(),
  keyPrefix: z.string(),
  initialApiKey: z.string().optional(),
  provisionedAt: z.string().datetime(),
});

const GdprDeletionRequestDataSchema = z.object({
  userId: z.string(),
  organizationIds: z.array(z.string()),
  requestedAt: z.string().datetime(),
});

// ── Combined schema map for Inngest EventSchemas.fromZod() ───────────────────

export const inngestSchemas = {
  // Clerk events
  "clerk/user.created": { data: ClerkUserDataSchema },
  "clerk/user.updated": { data: ClerkUserDataSchema },
  "clerk/user.deleted": {
    data: z.object({ userId: z.string() }),
  },
  "clerk/organization.created": { data: ClerkOrganizationDataSchema },
  "clerk/organization.updated": { data: ClerkOrganizationDataSchema },
  "clerk/organization.deleted": {
    data: z.object({ organizationId: z.string() }),
  },
  "clerk/organizationMembership.created": { data: ClerkMembershipDataSchema },
  "clerk/organizationMembership.deleted": { data: ClerkMembershipDataSchema },

  // Stripe events
  "stripe/subscription.updated": { data: StripeSubscriptionDataSchema },
  "stripe/subscription.deleted": { data: StripeSubscriptionDataSchema },
  "stripe/invoice.paid": { data: StripeInvoiceDataSchema },
  "stripe/invoice.payment_failed": { data: StripeInvoiceDataSchema },

  // Internal platform events
  "nebutra/tenant.provisioned": { data: TenantProvisionedDataSchema },
  "nebutra/gdpr.deletion_requested": { data: GdprDeletionRequestDataSchema },
  "nebutra/gdpr.deletion_completed": { data: GdprDeletionRequestDataSchema },
} as const;

// Export individual schemas for direct use in validation
export {
  ClerkMembershipDataSchema,
  ClerkOrganizationDataSchema,
  ClerkUserDataSchema,
  GdprDeletionRequestDataSchema,
  StripeInvoiceDataSchema,
  StripeSubscriptionDataSchema,
  TenantProvisionedDataSchema,
};

export type ClerkUserData = z.infer<typeof ClerkUserDataSchema>;
export type ClerkOrganizationData = z.infer<typeof ClerkOrganizationDataSchema>;
export type StripeSubscriptionData = z.infer<typeof StripeSubscriptionDataSchema>;
export type StripeInvoiceData = z.infer<typeof StripeInvoiceDataSchema>;
