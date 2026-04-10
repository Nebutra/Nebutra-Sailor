import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { type Prisma, prisma } from "@nebutra/db";
import { issueLicense } from "@nebutra/license";
import { logger } from "@nebutra/logger";
import Stripe from "stripe";

const log = logger.child({ service: "stripe-webhook" });

export const stripeWebhookRoutes = new OpenAPIHono();

const stripeWebhookRoute = createRoute({
  method: "post",
  path: "/stripe",
  tags: ["Webhooks"],
  summary: "Stripe webhook handler",
  description:
    "Receives Stripe webhook events for subscription lifecycle management. Signature verification is handled by the Stripe SDK.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({}).passthrough(),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Webhook received and queued for processing",
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
      description: "Webhook not configured",
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

  // Idempotency check — skip already-processed events
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { provider_eventId: { provider: "stripe", eventId: event.id } },
  });

  if (existingEvent?.processedAt) {
    log.info("Stripe event already processed, skipping", {
      eventId: event.id,
      type: event.type,
    });
    return c.json({ received: true as const, skipped: true }, 200);
  }

  // Persist event record (upsert in case of duplicate delivery before processing)
  await prisma.webhookEvent.upsert({
    where: { provider_eventId: { provider: "stripe", eventId: event.id } },
    create: {
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
      payload: event as unknown as Prisma.InputJsonValue,
    },
    update: {},
  });

  // Respond immediately; process asynchronously
  const response = c.json({ received: true as const }, 200);

  handleStripeEvent(event, stripe, prisma)
    .then(async () => {
      await prisma.webhookEvent.update({
        where: { provider_eventId: { provider: "stripe", eventId: event.id } },
        data: { processedAt: new Date() },
      });
    })
    .catch(async (err: unknown) => {
      log.error("Stripe event handler error", err, { type: event.type });
      await prisma.webhookEvent
        .update({
          where: {
            provider_eventId: { provider: "stripe", eventId: event.id },
          },
          data: {
            errorMessage: err instanceof Error ? err.message : "Unknown error",
            retryCount: { increment: 1 },
          },
        })
        .catch(() => {
          // Best-effort — do not throw inside catch
        });
    });

  return response;
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
    organizationId: stripeCustomer.organizationId,
    status: sub.status,
  });
}

async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
  db: PrismaClient,
): Promise<void> {
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
