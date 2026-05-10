import { getSystemDb, type Plan } from "@nebutra/db";
import { StripeInvoiceDataSchema, StripeSubscriptionDataSchema } from "@nebutra/event-bus";
import { logger } from "@nebutra/logger";
import { OrganizationRepository } from "@nebutra/repositories";
import { eventType, type InngestFunction } from "inngest";
import { inngest } from "../client.js";

// AUDIT(no-tenant): Stripe billing events arrive on a platform-wide queue.
// The orgId is resolved from the event payload, and the repository writes
// the plan on the Organization row — not on any tenant-scoped table.
const orgRepo = new OrganizationRepository(getSystemDb());

/**
 * Map a Stripe subscription status to an Organization plan.
 *
 * - active / trialing → keep or upgrade to PRO
 * - canceled / unpaid / past_due / paused / incomplete_expired → FREE
 */
function resolvePlanFromStatus(status: string): Plan {
  switch (status) {
    case "active":
    case "trialing":
      return "PRO";
    default:
      return "FREE";
  }
}

/**
 * Inngest function: react to Stripe billing events.
 *
 * event.data is fully typed via Zod v4 Standard Schema —
 * no manual string extraction needed.
 *
 * Handles:
 *   - stripe/subscription.updated  → update Organization.plan from subscription status
 *   - stripe/subscription.deleted  → downgrade Organization.plan to FREE
 *   - stripe/invoice.paid          → log successful payment
 *   - stripe/invoice.payment_failed → log payment failure
 */
export const processBillingEvent: InngestFunction.Any = inngest.createFunction(
  {
    id: "process-billing-event",
    name: "Process Stripe Billing Event",
    concurrency: { limit: 5 },
    retries: 3,
    triggers: [
      { event: eventType("stripe/subscription.updated", { schema: StripeSubscriptionDataSchema }) },
      { event: eventType("stripe/subscription.deleted", { schema: StripeSubscriptionDataSchema }) },
      { event: eventType("stripe/invoice.paid", { schema: StripeInvoiceDataSchema }) },
      { event: eventType("stripe/invoice.payment_failed", { schema: StripeInvoiceDataSchema }) },
    ],
  },
  async ({ event, step }) => {
    const eventName = event.name;

    logger.info("Processing Stripe billing event", { eventName });

    if (
      eventName === "stripe/subscription.updated" ||
      eventName === "stripe/subscription.deleted"
    ) {
      const { organizationId, status } = event.data;

      const resolvedStatus = eventName === "stripe/subscription.deleted" ? "canceled" : status;
      const targetPlan = resolvePlanFromStatus(resolvedStatus);

      await step.run("update-organization-plan", async () => {
        await orgRepo.updateById(organizationId, { plan: targetPlan });

        logger.info("Organization plan updated", {
          organizationId,
          status: resolvedStatus,
          plan: targetPlan,
        });
      });

      return;
    }

    if (eventName === "stripe/invoice.paid") {
      await step.run("log-invoice-paid", async () => {
        const { invoiceId, organizationId } = event.data;
        logger.info("Stripe invoice paid", { invoiceId, organizationId });
      });

      return;
    }

    if (eventName === "stripe/invoice.payment_failed") {
      await step.run("log-payment-failure", async () => {
        const { invoiceId, organizationId, failureReason } = event.data;
        logger.warn("Stripe invoice payment failed", {
          invoiceId,
          organizationId,
          reason: failureReason,
        });
      });

      return;
    }
  },
);
