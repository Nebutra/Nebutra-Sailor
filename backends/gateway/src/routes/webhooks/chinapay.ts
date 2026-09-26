import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  ALIPAY_NOTIFY_SUCCESS_BODIES,
  type SettlePaymentOrderInput,
  settlePaymentOrder,
  verifyAlipayNotification,
  verifyAndDecryptWechatNotification,
  WECHAT_NOTIFY_FAIL,
  WECHAT_NOTIFY_OK,
} from "@nebutra/billing";
import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { acceptWebhookEvent, type JsonValue, WebhookEventRepository } from "@nebutra/repositories";

// AUDIT(no-tenant): WeChat Pay / Alipay notifications arrive without a
// request-scoped tenant context; the tenant comes from the payment order the
// merchant order number names. All writes below use the system-scope client.
const prisma = getSystemDb();

const log = logger.child({ service: "chinapay-webhook" });

export const chinaPayWebhookRoutes = new OpenAPIHono();

/**
 * The merchant order number is the PaymentOrder id, so the notification needs
 * no metadata of its own. An unknown order is acknowledged, not retried: the
 * signature proved it came from the wallet, and retrying cannot make it exist.
 */
async function settleWalletPayment(input: SettlePaymentOrderInput): Promise<void> {
  const outcome = await settlePaymentOrder(input);
  if (outcome === "not_found") {
    log.error("Wallet notification for an unknown payment order", { orderId: input.orderId });
  }
}

// =============================================================================
// WeChat Pay APIv3 notification
// =============================================================================

const wechatRoute = createRoute({
  method: "post",
  path: "/chinapay/wechat",
  tags: ["Webhooks"],
  summary: "WeChat Pay APIv3 payment notification",
  description:
    "Verifies the platform-certificate signature, decrypts the AEAD_AES_256_GCM resource, and credits the purchase. 2xx only after the inbox row is marked processed.",
  request: {
    body: { content: { "application/json": { schema: z.object({}).catchall(z.any()) } } },
  },
  responses: {
    200: {
      description:
        "Per the WeChat Pay v3 contract: {code:'SUCCESS'} on success, {code:'FAIL'} to trigger a retry.",
      content: {
        "application/json": { schema: z.object({ code: z.string(), message: z.string() }) },
      },
    },
    400: {
      description: "Invalid signature or headers",
      content: {
        "application/json": { schema: z.object({ code: z.string(), message: z.string() }) },
      },
    },
  },
});

chinaPayWebhookRoutes.openapi(wechatRoute, async (c) => {
  const rawBody = await c.req.text();
  const timestamp = c.req.header("Wechatpay-Timestamp");
  const nonce = c.req.header("Wechatpay-Nonce");
  const signature = c.req.header("Wechatpay-Signature");
  const serial = c.req.header("Wechatpay-Serial");

  if (!timestamp || !nonce || !signature || !serial) {
    return c.json(WECHAT_NOTIFY_FAIL("missing signature headers"), 400);
  }

  let resource: Awaited<ReturnType<typeof verifyAndDecryptWechatNotification>>;
  try {
    resource = await verifyAndDecryptWechatNotification(
      { timestamp, nonce, signature, serial },
      rawBody,
    );
  } catch (err) {
    log.error("WeChat Pay notification verification failed", err);
    return c.json(WECHAT_NOTIFY_FAIL("signature verification failed"), 400);
  }

  const inbox = new WebhookEventRepository(prisma);
  const eventId = `${resource.transaction_id}:${resource.trade_state}`;

  let accepted: Awaited<ReturnType<typeof acceptWebhookEvent>>;
  try {
    accepted = await acceptWebhookEvent(inbox, {
      provider: "chinapay",
      eventId,
      eventType: `wechat.${resource.trade_state}`,
      payload: resource as unknown as JsonValue,
    });
  } catch (err) {
    log.error("Failed to record WeChat Pay webhook event", err, { eventId });
    return c.json(WECHAT_NOTIFY_FAIL("failed to record event"), 500) as never;
  }

  if (accepted.outcome === "skip_processed" || accepted.outcome === "in_flight") {
    return c.json(WECHAT_NOTIFY_OK, 200);
  }

  try {
    if (resource.trade_state === "SUCCESS") {
      await settleWalletPayment({
        orderId: resource.out_trade_no,
        paidMinor: resource.amount?.total ?? 0,
        currency: resource.amount?.currency ?? "CNY",
        providerRef: resource.transaction_id,
      });
    }
    await inbox.markProcessed("chinapay", eventId);
    return c.json(WECHAT_NOTIFY_OK, 200);
  } catch (err) {
    log.error("WeChat Pay webhook handler error", err, { eventId });
    await inbox
      .markFailed("chinapay", eventId, err instanceof Error ? err.message : "Unknown error")
      .catch((updateError) =>
        log.warn("Failed to persist WeChat Pay failure state", { error: updateError, eventId }),
      );
    return c.json(WECHAT_NOTIFY_FAIL("handler error"), 500) as never;
  }
});

// =============================================================================
// Alipay async notification — form-encoded; Alipay expects the literal
// string "success"/"failure" back, not JSON.
// =============================================================================

const alipayRoute = createRoute({
  method: "post",
  path: "/chinapay/alipay",
  tags: ["Webhooks"],
  summary: "Alipay async payment notification",
  description:
    "Verifies the RSA2 signature and credits the purchase. Responds 'success' or 'failure' per Alipay's contract, not JSON.",
  request: {
    body: {
      content: {
        "application/x-www-form-urlencoded": { schema: z.object({}).catchall(z.string()) },
      },
    },
  },
  responses: {
    200: {
      description: "'success' or 'failure'",
      content: { "text/plain": { schema: z.string() } },
    },
  },
});

chinaPayWebhookRoutes.openapi(alipayRoute, async (c) => {
  const body = await c.req.parseBody();
  const fields: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") fields[key] = value;
  }

  if (!verifyAlipayNotification(fields)) {
    log.error("Alipay notification signature invalid", { outTradeNo: fields.out_trade_no });
    return c.text("failure", 400) as never;
  }

  const inbox = new WebhookEventRepository(prisma);
  const eventId = `${fields.trade_no ?? fields.out_trade_no}:${fields.trade_status}`;

  let accepted: Awaited<ReturnType<typeof acceptWebhookEvent>>;
  try {
    accepted = await acceptWebhookEvent(inbox, {
      provider: "chinapay",
      eventId,
      eventType: `alipay.${fields.trade_status ?? "unknown"}`,
      payload: fields as unknown as JsonValue,
    });
  } catch (err) {
    log.error("Failed to record Alipay webhook event", err, { eventId });
    return c.text("failure", 500) as never;
  }

  if (accepted.outcome === "skip_processed" || accepted.outcome === "in_flight") {
    return c.text("success", 200) as never;
  }

  try {
    if (
      fields.trade_status &&
      ALIPAY_NOTIFY_SUCCESS_BODIES.includes(fields.trade_status) &&
      fields.out_trade_no
    ) {
      await settleWalletPayment({
        orderId: fields.out_trade_no,
        paidMinor: Math.round(Number.parseFloat(fields.total_amount ?? "0") * 100),
        currency: "CNY",
        ...(fields.trade_no ? { providerRef: fields.trade_no } : {}),
      });
    }
    await inbox.markProcessed("chinapay", eventId);
    return c.text("success", 200) as never;
  } catch (err) {
    log.error("Alipay webhook handler error", err, { eventId });
    await inbox
      .markFailed("chinapay", eventId, err instanceof Error ? err.message : "Unknown error")
      .catch((updateError) =>
        log.warn("Failed to persist Alipay failure state", { error: updateError, eventId }),
      );
    return c.text("failure", 500) as never;
  }
});
