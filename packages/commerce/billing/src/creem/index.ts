import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "@nebutra/logger";
import { BillingError } from "../types";

// =============================================================================
// Creem — the global card rail (merchant of record)
// =============================================================================
// ADR 2026-09-26 Creem for global payments. Creem is the seller of record: it
// collects card payments worldwide and remits sales tax / VAT itself, so a
// mainland company can sell abroad without a Stripe account or a tax
// registration per country. Hand-rolled against the documented REST API
// (https://docs.creem.io) — no SDK, so the API key never passes through an
// unaudited dependency, same reasoning as chinapay/.
//
// One Creem product carries every offer: a one-time product whose price is
// overridden per checkout with `custom_price`, so the offer catalog stays the
// only place a price is written.
// =============================================================================

const log = logger.child({ service: "creem" });

export interface CreemConfig {
  apiKey: string;
  /** The one-time product every checkout is opened against. */
  productId: string;
  /** Signs webhook deliveries (Developers → Webhook in the Creem dashboard). */
  webhookSecret?: string;
  /** Test mode uses https://test-api.creem.io; keys are per mode. */
  testMode: boolean;
}

export function isCreemConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.CREEM_API_KEY && env.CREEM_PRODUCT_ID);
}

export function getCreemConfig(env: Record<string, string | undefined> = process.env): CreemConfig {
  const apiKey = env.CREEM_API_KEY?.trim();
  const productId = env.CREEM_PRODUCT_ID?.trim();
  if (!apiKey || !productId) {
    throw new BillingError(
      "Creem is not configured (CREEM_API_KEY, CREEM_PRODUCT_ID)",
      "CREEM_UNCONFIGURED",
      500,
    );
  }
  return {
    apiKey,
    productId,
    webhookSecret: env.CREEM_WEBHOOK_SECRET?.trim() || undefined,
    testMode: env.CREEM_TEST_MODE === "true",
  };
}

function baseUrl(cfg: CreemConfig): string {
  return cfg.testMode ? "https://test-api.creem.io" : "https://api.creem.io";
}

async function creemRequest<T>(
  cfg: CreemConfig,
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const res = await fetchImpl(`${baseUrl(cfg)}${path}`, {
    method,
    headers: {
      "x-api-key": cfg.apiKey,
      accept: "application/json",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    log.error("Creem request failed", { method, path, status: res.status, body: data });
    const message = Array.isArray(data.message) ? data.message.join("; ") : data.message;
    throw new BillingError(
      `Creem request failed: ${typeof message === "string" ? message : res.statusText}`,
      "CREEM_REQUEST_FAILED",
      res.status >= 500 ? 502 : 400,
      data,
    );
  }
  return data as T;
}

// -----------------------------------------------------------------------------
// Checkout
// -----------------------------------------------------------------------------

export interface CreateCreemCheckoutInput {
  /** Our PaymentOrder id; comes back as `request_id` on the checkout. */
  requestId: string;
  /** Price in the product's currency, minor units. Creem accepts 100–99,999,999. */
  customPriceMinor: number;
  successUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface CreemCheckout {
  id: string;
  checkout_url: string;
  status: "pending" | "processing" | "completed" | "expired";
}

export async function createCreemCheckout(
  input: CreateCreemCheckoutInput,
  fetchImpl: typeof fetch = fetch,
): Promise<CreemCheckout> {
  const cfg = getCreemConfig();
  if (!(Number.isInteger(input.customPriceMinor) && input.customPriceMinor >= 100)) {
    throw new BillingError(
      "Creem needs a price of at least 100 minor units",
      "CREEM_PRICE_OUT_OF_RANGE",
      400,
    );
  }
  return creemRequest<CreemCheckout>(
    cfg,
    "POST",
    "/v1/checkouts",
    {
      product_id: cfg.productId,
      request_id: input.requestId,
      custom_price: input.customPriceMinor,
      success_url: input.successUrl,
      ...(input.customerEmail ? { customer: { email: input.customerEmail } } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
    fetchImpl,
  );
}

export interface CreemOrder {
  id: string;
  /** Before tax. Creem adds tax on top as the merchant of record. */
  amount: number;
  currency: string;
  status: string;
}

/** A checkout's state and, once paid, its order. For reconciling lost webhooks. */
export async function getCreemCheckout(
  checkoutId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ status: CreemCheckout["status"]; order?: CreemOrder }> {
  const cfg = getCreemConfig();
  return creemRequest(
    cfg,
    "GET",
    `/v1/checkouts?checkout_id=${encodeURIComponent(checkoutId)}`,
    undefined,
    fetchImpl,
  );
}

// -----------------------------------------------------------------------------
// Refunds — full only. Creem's API refunds "the full remaining refundable
// amount" of a transaction; there is no amount parameter and no idempotency
// key, so a partial refund is refused before any call is made.
// -----------------------------------------------------------------------------

export async function refundCreemOrder(
  creemOrderId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ status: "succeeded" | "processing" | "failed" }> {
  const cfg = getCreemConfig();
  const search = await creemRequest<{ items?: Array<{ id: string; status?: string }> }>(
    cfg,
    "GET",
    `/v1/transactions/search?order_id=${encodeURIComponent(creemOrderId)}`,
    undefined,
    fetchImpl,
  );
  const transaction = search.items?.[0];
  if (!transaction) {
    throw new BillingError(
      `No Creem transaction for order ${creemOrderId}`,
      "CREEM_TRANSACTION_NOT_FOUND",
      404,
    );
  }
  if (transaction.status === "refunded") return { status: "succeeded" };

  const refund = await creemRequest<{ status: string }>(
    cfg,
    "POST",
    "/v1/refunds",
    { transaction_id: transaction.id },
    fetchImpl,
  );
  return {
    status:
      refund.status === "succeeded"
        ? "succeeded"
        : refund.status === "pending" || refund.status === "requiresAction"
          ? "processing"
          : "failed",
  };
}

// -----------------------------------------------------------------------------
// Webhooks — `creem-signature` is the hex HMAC-SHA256 of the raw body under the
// webhook secret. Verify the bytes as received; parsing first changes them.
// -----------------------------------------------------------------------------

export function verifyCreemSignature(
  rawBody: string,
  signature: string | null | undefined,
  // Defaults to CREEM_WEBHOOK_SECRET; pass null to mean "no secret".
  secret: string | null | undefined = getCreemConfig().webhookSecret,
): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface CreemWebhookEvent {
  id: string;
  eventType: string;
  created_at: number;
  object: {
    id: string;
    request_id?: string;
    metadata?: Record<string, string>;
    order?: CreemOrder;
  };
}
