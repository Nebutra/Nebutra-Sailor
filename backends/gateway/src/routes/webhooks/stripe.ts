import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { type CreditPurchaseWebhookInput, handleCreditPurchaseWebhook } from "@nebutra/billing";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { getSystemDb } from "@nebutra/db";
import { issueLicense } from "@nebutra/license";
import { logger } from "@nebutra/logger";
import { acceptWebhookEvent, type JsonValue, WebhookEventRepository } from "@nebutra/repositories";
import Stripe from "stripe";
import { inngest } from "../../inngest/client.js";

// AUDIT(no-tenant): Stripe webhooks arrive without a request-scoped tenant
// context; the tenant is resolved from the webhook payload inside each
// handler. All writes below use the system-scope Prisma client.
const prisma = getSystemDb();

const log = logger.child({ service: "stripe-webhook" });

// ============================================
// Product analytics helper — fire-and-forget, silent-fail.
// Respects NEBUTRA_TELEMETRY=0. Product events go through the PostHog client;
// Dub attribution remains on `createAnalyticsClient` and is not used here.
// ============================================
function isTelemetryDisabled(): boolean {
  const envValue = process.env.NEBUTRA_TELEMETRY;
  return envValue === "0" || envValue === "false";
}

function emitCheckoutCompleted(props: Record<string, unknown>): void {
  if (isTelemetryDisabled()) return;

  void (async () => {
    try {
      const mod = (await import("@nebutra/analytics")) as unknown as {
        createProductAnalyticsClient?: (config: unknown) => {
          track: (event: string, props: Record<string, unknown>) => Promise<unknown> | unknown;
        };
      };

      if (typeof mod.createProductAnalyticsClient !== "function") return;

      const client = mod.createProductAnalyticsClient({
        posthog: {
          apiKey:
            process.env.POSTHOG_KEY ??
            process.env.NEXT_PUBLIC_POSTHOG_KEY ??
            process.env.NEBUTRA_POSTHOG_KEY ??
            "",
          host:
            process.env.POSTHOG_HOST ??
            process.env.NEXT_PUBLIC_POSTHOG_HOST ??
            process.env.NEBUTRA_POSTHOG_HOST ??
            getBrandOrigin("analytics"),
        },
        onError: () => {
          log.warn("Stripe checkout telemetry sink reported an internal error");
        },
      });

      if (typeof client?.track !== "function") return;

      const result = client.track("checkout", { action: "completed", ...props });
      if (result && typeof (result as Promise<unknown>).then === "function") {
        await (result as Promise<unknown>).catch((error) => {
          log.warn("Stripe checkout telemetry emit failed", { error });
        });
      }
    } catch (error) {
      log.warn("Stripe checkout telemetry bootstrap failed", { error });
    }
  })();
}

export const stripeWebhookRoutes = new OpenAPIHono();

const stripeWebhookRoute = createRoute({
  method: "post",
  path: "/stripe",
  tags: ["Webhooks"],
  summary: "Stripe webhook handler",
  description:
    "Receives Stripe webhook events for subscription lifecycle management. Signature verification is handled by the Stripe SDK. 2xx is returned only after the inbox row is marked processed.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({}).catchall(z.any()),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Webhook processed, or already processed",
      content: {
        "application/json": {
          schema: z.object({
            received: z.literal(true),
            skipped: z.boolean().optional(),
          }),
        },
      },
    },
    400: {
      description: "Invalid signature or missing headers",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    500: {
      description: "Webhook not configured or handler failed",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
    503: {
      description: "Event is still being processed; provider should retry",
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
});

stripeWebhookRoutes.openapi(stripeWebhookRoute, async (c) => {
  const rawBody = await c.req.text();
  const sig = c.req.header("stripe-signature");

  if (!sig) {
    return c.json({ error: "Missing stripe-signature header" }, 400);
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !secretKey) {
    log.error("Stripe webhook env vars not configured");
    return c.json({ error: "Webhook not configured" }, 500);
  }

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    log.error("Stripe signature verification failed", err);
    return c.json({ error: "Invalid signature" }, 400);
  }

  const inbox = new WebhookEventRepository(prisma);
  let accepted: Awaited<ReturnType<typeof acceptWebhookEvent>>;
  try {
    accepted = await acceptWebhookEvent(inbox, {
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
      payload: event as unknown as JsonValue,
    });
  } catch (err) {
    log.error("Failed to record Stripe webhook event", err, {
      eventId: event.id,
      type: event.type,
    });
    return c.json({ error: "Failed to record event" }, 500);
  }

  if (accepted.outcome === "skip_processed") {
    log.info("Stripe event already processed, skipping", {
      eventId: event.id,
      type: event.type,
    });
    return c.json({ received: true as const, skipped: true }, 200);
  }

  if (accepted.outcome === "in_flight") {
    log.info("Stripe event is still processing", {
      eventId: event.id,
      type: event.type,
    });
    return c.json({ error: "Event is still processing" }, 503);
  }

  try {
    await handleStripeEvent(event, stripe, prisma);
    await inbox.markProcessed("stripe", event.id);
    return c.json({ received: true as const }, 200);
  } catch (err) {
    log.error("Stripe event handler error", err, { type: event.type });
    await inbox
      .markFailed("stripe", event.id, err instanceof Error ? err.message : "Unknown error")
      .catch((updateError) => {
        log.warn("Failed to persist Stripe webhook handler failure state", {
          error: updateError,
          eventId: event.id,
        });
      });
    return c.json({ error: "Failed to process event" }, 500);
  }
});

// ============================================
// Helpers
// ============================================

// ============================================
// Prisma type alias for ergonomics
// ============================================

type PrismaClient = typeof prisma;

// ============================================
// Subscription status mapping
// ============================================

// Prisma SubscriptionStatus enum values (from schema.prisma):
// ACTIVE | PAST_DUE | CANCELED | UNPAID | TRIALING | PAUSED | INCOMPLETE
type PrismaSubscriptionStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID"
  | "TRIALING"
  | "PAUSED"
  | "INCOMPLETE";

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): PrismaSubscriptionStatus {
  const statusMap: Record<string, PrismaSubscriptionStatus> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    trialing: "TRIALING",
    unpaid: "UNPAID",
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELED",
    paused: "PAUSED",
  };
  return statusMap[stripeStatus] ?? "ACTIVE";
}

// ============================================
// Event handler
// ============================================

async function handleStripeEvent(
  event: Stripe.Event,
  stripe: Stripe,
  db: PrismaClient,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, stripe, db);
      break;
    }
    case "customer.subscription.created": {
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription, db);
      break;
    }
    case "customer.subscription.updated": {
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, db);
      break;
    }
    case "customer.subscription.deleted": {
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, db);
      break;
    }
    case "invoice.paid": {
      await handleInvoicePaid(event.data.object as Stripe.Invoice, db);
      break;
    }
    case "invoice.payment_failed": {
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, db);
      break;
    }
    default:
      log.info("Unhandled Stripe event type", { type: event.type });
  }
}

// ============================================
// Individual event handlers
// ============================================

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  db: PrismaClient,
): Promise<void> {
  const metadata = session.metadata ?? {};
  const licenseTier =
    typeof metadata.license_tier === "string" && metadata.license_tier.length > 0
      ? metadata.license_tier
      : "UNKNOWN";

  // Phase 0 analytics — fire-and-forget checkout.completed emission.
  emitCheckoutCompleted({
    ...(typeof metadata.userId === "string" ? { userId: metadata.userId } : {}),
    ...(session.amount_total !== null ? { amount_cents: session.amount_total } : {}),
    ...(session.currency ? { currency: session.currency } : {}),
    checkout_session_id: session.id,
    payment_method: "stripe",
    tier: licenseTier,
  });

  // Credit purchase — unified handler across providers
  const creditWebhookInput: CreditPurchaseWebhookInput = {
    provider: "stripe",
    sessionId: session.id,
    metadata,
  };
  if (session.amount_total) {
    creditWebhookInput.amountPaid = session.amount_total / 100;
  }
  if (session.currency) {
    creditWebhookInput.currency = session.currency.toUpperCase();
  }

  const creditResult = await handleCreditPurchaseWebhook(creditWebhookInput);

  if (creditResult.handled) {
    log.info("Credit purchase webhook handled", {
      sessionId: session.id,
      organizationId: creditResult.organizationId,
      creditAmount: creditResult.creditAmount,
      transactionId: creditResult.transactionId,
      skipped: creditResult.skipped,
    });
    return;
  }

  // Fulfill Startup License via @nebutra/license (idempotent + enqueues profile/email)
  if (session.metadata?.license_tier === "STARTUP" && session.metadata?.userId) {
    const userId = session.metadata.userId;
    const customerName =
      session.customer_details?.name || session.customer_details?.email?.split("@")[0] || "Founder";

    const license = await issueLicense({
      userId,
      tier: "STARTUP",
      displayName: customerName,
      email: session.customer_details?.email ?? null,
      lookingFor: session.metadata.lookingFor ? JSON.parse(session.metadata.lookingFor) : [],
      githubHandle: session.metadata.githubHandle || null,
      projectName: session.metadata.projectName || null,
      projectUrl: session.metadata.projectUrl || null,
    });

    log.info("STARTUP License activated", { userId, licenseId: license.id });
  }

  if (!session.subscription) {
    log.info("Checkout session completed without subscription", {
      sessionId: session.id,
    });
    return;
  }

  const sub = await stripe.subscriptions.retrieve(session.subscription as string);

  await db.subscription.updateMany({
    where: { stripeId: sub.id },
    data: { status: mapStripeStatus(sub.status) },
  });

  log.info("Checkout session completed, subscription activated", {
    sessionId: session.id,
    subscriptionId: sub.id,
  });
}

async function handleSubscriptionCreated(
  sub: Stripe.Subscription,
  db: PrismaClient,
): Promise<void> {
  // Look up the organization via StripeCustomer mapping
  const stripeCustomer = await db.stripeCustomer.findUnique({
    where: { stripeId: sub.customer as string },
  });

  if (!stripeCustomer) {
    log.error("No StripeCustomer found for subscription.created event", null, {
      customerId: sub.customer,
      subscriptionId: sub.id,
    });
    return;
  }

  // Upsert subscription record — in case it was pre-created on our side
  await db.subscription.updateMany({
    where: { stripeId: sub.id },
    data: {
      status: mapStripeStatus(sub.status),
      currentPeriodStart: new Date((sub.items.data[0]?.current_period_start ?? sub.created) * 1000),
      currentPeriodEnd: new Date((sub.items.data[0]?.current_period_end ?? sub.created) * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });

  log.info("Subscription created", {
    subscriptionId: sub.id,
    organizationId: stripeCustomer.tenantId,
    status: sub.status,
  });
}

async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
  db: PrismaClient,
): Promise<void> {
  const stripeCustomer = await db.stripeCustomer.findUnique({
    where: { stripeId: sub.customer as string },
  });

  if (!stripeCustomer) {
    log.error("No StripeCustomer found for subscription.updated event", null, {
      customerId: sub.customer,
      subscriptionId: sub.id,
    });
    return;
  }

  const status = mapStripeStatus(sub.status);

  await db.subscription.updateMany({
    where: { stripeId: sub.id },
    data: {
      status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodStart: new Date((sub.items.data[0]?.current_period_start ?? sub.created) * 1000),
      currentPeriodEnd: new Date((sub.items.data[0]?.current_period_end ?? sub.created) * 1000),
      ...(sub.trial_start && {
        trialStart: new Date(sub.trial_start * 1000),
      }),
      ...(sub.trial_end && {
        trialEnd: new Date(sub.trial_end * 1000),
      }),
      ...(sub.canceled_at && {
        canceledAt: new Date(sub.canceled_at * 1000),
      }),
    },
  });

  await inngest.send({
    name: "stripe/subscription.updated",
    data: {
      organizationId: stripeCustomer.tenantId,
      subscriptionId: sub.id,
      customerId: sub.customer as string,
      status: sub.status,
    },
  });

  log.info("Subscription updated", { subscriptionId: sub.id, status });
}

async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
  db: PrismaClient,
): Promise<void> {
  await db.subscription.updateMany({
    where: { stripeId: sub.id },
    data: {
      status: "CANCELED",
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : new Date(),
    },
  });

  log.info("Subscription deleted/canceled", { subscriptionId: sub.id });
}

async function handleInvoicePaid(invoice: Stripe.Invoice, db: PrismaClient): Promise<void> {
  if (!invoice.id) return;

  // Update the local invoice record if it exists
  await db.invoice.updateMany({
    where: { stripeId: invoice.id },
    data: {
      status: "PAID",
      amountPaid: invoice.amount_paid / 100,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
    },
  });

  log.info("Invoice paid", {
    invoiceId: invoice.id,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
  });
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  db: PrismaClient,
): Promise<void> {
  if (!invoice.id) return;

  await db.invoice.updateMany({
    where: { stripeId: invoice.id },
    data: { status: "OPEN" },
  });

  // Mark associated subscription as past_due
  const subscriptionId = invoice.lines.data[0]?.subscription;
  if (subscriptionId) {
    await db.subscription.updateMany({
      where: { stripeId: subscriptionId as string },
      data: { status: "PAST_DUE" },
    });
  }

  log.error("Invoice payment failed", null, {
    invoiceId: invoice.id,
    subscriptionId: invoice.lines.data[0]?.subscription,
    currency: invoice.currency,
    amountDue: invoice.amount_due,
  });
}
