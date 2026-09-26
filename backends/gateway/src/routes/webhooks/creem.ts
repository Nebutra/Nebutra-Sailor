import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  type CreemWebhookEvent,
  PAYMENT_ORDER_METADATA_KEY,
  settlePaymentOrder,
  verifyCreemSignature,
} from "@nebutra/billing";
import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { acceptWebhookEvent, type JsonValue, WebhookEventRepository } from "@nebutra/repositories";

// AUDIT(no-tenant): Creem deliveries carry no request tenant; the tenant comes
// from the payment order the checkout's request_id names. All writes below use
// the system-scope client, same as the Stripe and wallet routes.
const prisma = getSystemDb();

const log = logger.child({ service: "creem-webhook" });

export const creemWebhookRoutes = new OpenAPIHono();

const creemRoute = createRoute({
  method: "post",
  path: "/creem",
  tags: ["Webhooks"],
  summary: "Creem webhook",
  description:
    "Verifies `creem-signature` (hex HMAC-SHA256 of the raw body) and settles the payment order a `checkout.completed` names. 2xx only after the inbox row is marked processed.",
  request: {
    body: { content: { "application/json": { schema: z.object({}).catchall(z.any()) } } },
  },
  responses: {
    200: {
      description: "Accepted",
      content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
    },
    401: {
      description: "Bad signature",
      content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
    },
  },
});

creemWebhookRoutes.openapi(creemRoute, async (c) => {
  // Verify the bytes as received — parsing first would change them.
  const rawBody = await c.req.text();
  if (!verifyCreemSignature(rawBody, c.req.header("creem-signature"))) {
    log.warn("Creem webhook with a bad or missing signature");
    return c.json({ ok: false }, 401);
  }

  const event = JSON.parse(rawBody) as CreemWebhookEvent;
  const inbox = new WebhookEventRepository(prisma);

  let accepted: Awaited<ReturnType<typeof acceptWebhookEvent>>;
  try {
    accepted = await acceptWebhookEvent(inbox, {
      provider: "creem",
      eventId: event.id,
      eventType: event.eventType,
      payload: event as unknown as JsonValue,
    });
  } catch (err) {
    log.error("Failed to record Creem webhook event", err, { eventId: event.id });
    return c.json({ ok: false }, 500) as never;
  }
  if (accepted.outcome === "skip_processed" || accepted.outcome === "in_flight") {
    return c.json({ ok: true }, 200);
  }

  try {
    if (event.eventType === "checkout.completed") {
      const orderId =
        event.object.request_id ?? event.object.metadata?.[PAYMENT_ORDER_METADATA_KEY];
      const order = event.object.order;
      if (orderId && order && order.status === "paid") {
        // `amount` is before tax: Creem adds tax on top as merchant of record,
        // and the order's locked price is what we charged for the offer.
        const outcome = await settlePaymentOrder({
          orderId,
          paidMinor: order.amount,
          currency: order.currency,
          providerRef: order.id,
        });
        if (outcome === "not_found") {
          log.error("Creem checkout for an unknown payment order", {
            orderId,
            checkout: event.object.id,
          });
        }
      }
    } else if (event.eventType === "refund.created") {
      // Refunds we start go through refundPaymentOrder, which records them. One
      // issued from the Creem dashboard lands here: surfaced, not guessed at.
      log.warn("Creem refund created", { refund: event.object.id });
    }
    await inbox.markProcessed("creem", event.id);
    return c.json({ ok: true }, 200);
  } catch (err) {
    log.error("Creem webhook handler error", err, { eventId: event.id });
    await inbox
      .markFailed("creem", event.id, err instanceof Error ? err.message : "Unknown error")
      .catch(() => {});
    return c.json({ ok: false }, 500) as never;
  }
});
