import { logger } from "@nebutra/logger";
import { getCheckout, isChinaPayConfigured } from "../checkout/factory";
import { refundStripeCheckoutSession } from "../checkout/stripe";
import type { PaymentSession } from "../checkout/types";
import { getFulfillment, type RevocationResult } from "../fulfillment/index";
import {
  getOffer,
  type LockedFulfillmentSpec,
  type OfferCurrency,
  priceOffer,
  toMajorString,
  toMinorUnits,
} from "../offers/index";
import { BillingError } from "../types";

// =============================================================================
// Payment orders — the money side of every purchase
// =============================================================================
// create   → price locked from the offer, order row written, provider called
// settle   → a provider says "paid": check the amount, mark PAID, fulfill
// reconcile→ ask the wallet about orders whose notification never came, and
//            retry fulfillment for orders paid but not yet handed over
// refund   → move the money back, then ask the fulfillment to take back
//
// Storage is a port: the host injects a store (the gateway passes
// PaymentOrderRepository from @nebutra/repositories), so this package never
// touches Prisma.
// =============================================================================

const log = logger.child({ service: "payment-orders" });

export type PaymentMethod = "card" | "alipay" | "wechat";
export type PaymentOrderStatus = "PENDING" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "EXPIRED";

export interface PaymentOrderRecord {
  id: string;
  tenantId: string;
  offerId: string;
  fulfillment: unknown;
  amountMinor: number;
  currency: string;
  provider: string;
  method: string;
  providerRef: string | null;
  status: PaymentOrderStatus;
  paidMinor: number | null;
  refundedMinor: number;
  fulfilledAt: Date | null;
  expiresAt: Date;
  metadata: unknown;
  createdAt: Date;
}

export interface PaymentOrderStore {
  create(data: {
    tenantId: string;
    offerId: string;
    fulfillment: LockedFulfillmentSpec;
    amountMinor: number;
    currency: string;
    provider: string;
    method: string;
    expiresAt: Date;
  }): Promise<PaymentOrderRecord>;
  findById(id: string): Promise<PaymentOrderRecord | null>;
  setProviderRef(id: string, providerRef: string): Promise<void>;
  markPaid(id: string, data: { paidMinor: number; providerRef?: string }): Promise<boolean>;
  markFulfilled(id: string): Promise<boolean>;
  markExpired(id: string): Promise<boolean>;
  recordRefund(
    id: string,
    data: { previousRefundedMinor: number; refundedMinor: number; fullyRefunded: boolean },
  ): Promise<boolean>;
  listPendingCreatedBefore(before: Date, limit: number): Promise<PaymentOrderRecord[]>;
  listPaidUnfulfilled(limit: number): Promise<PaymentOrderRecord[]>;
}

let store: PaymentOrderStore | undefined;

export function configurePaymentOrderStore(next: PaymentOrderStore): void {
  store = next;
}

function requireStore(): PaymentOrderStore {
  if (!store) {
    throw new BillingError(
      "Payment orders are not configured — call configurePaymentOrderStore() at boot",
      "PAYMENT_ORDER_STORE_UNCONFIGURED",
      500,
    );
  }
  return store;
}

/** How long a checkout stays payable before reconcile gives up on it. */
const ORDER_TTL_MS = 30 * 60 * 1000;
/** A notification normally lands within seconds; after this, go and ask. */
const RECONCILE_AFTER_MS = 2 * 60 * 1000;

function currencyFor(method: PaymentMethod): OfferCurrency {
  return method === "card" ? "USD" : "CNY";
}

/** Whether a method has credentials behind it right now. */
export function isPaymentMethodAvailable(method: PaymentMethod): boolean {
  // Cards go through Creem, the merchant of record (ADR 2026-09-26).
  if (method === "card") return Boolean(process.env.CREEM_API_KEY && process.env.CREEM_PRODUCT_ID);
  return isChinaPayConfigured(method);
}

function lockedSpec(order: PaymentOrderRecord): LockedFulfillmentSpec {
  const spec = order.fulfillment as Partial<LockedFulfillmentSpec> | null;
  if (!(spec?.type && spec.product)) {
    throw new BillingError(
      `Order ${order.id} has no locked product to fulfill into`,
      "FULFILLMENT_PRODUCT_MISSING",
      500,
    );
  }
  return spec as LockedFulfillmentSpec;
}

/** Read one order, for status polling and support. */
export async function getPaymentOrder(orderId: string): Promise<PaymentOrderRecord | null> {
  return requireStore().findById(orderId);
}

// -----------------------------------------------------------------------------
// Create
// -----------------------------------------------------------------------------

export interface CreatePaymentOrderInput {
  organizationId: string;
  offerId: string;
  method: PaymentMethod;
  channel?: "qr" | "h5";
  /** Major units, for an offer whose buyer names the amount. Ignored by fixed-price offers. */
  amount?: number;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  clientIp?: string;
}

export interface CreatedPaymentOrder {
  orderId: string;
  session: PaymentSession;
  amountMinor: number;
  currency: OfferCurrency;
}

export async function createPaymentOrder(
  input: CreatePaymentOrderInput,
): Promise<CreatedPaymentOrder> {
  const offer = getOffer(input.offerId);
  if (!offer) {
    throw new BillingError(`Unknown offer: ${input.offerId}`, "OFFER_NOT_FOUND", 400);
  }
  if (!isPaymentMethodAvailable(input.method)) {
    throw new BillingError(
      `Payment method not available: ${input.method}`,
      "PAYMENT_METHOD_UNAVAILABLE",
      400,
    );
  }

  const currency = currencyFor(input.method);
  const price = priceOffer(offer, currency, input.amount);

  const orders = requireStore();
  const amountMinor = toMinorUnits(price);
  const provider = input.method === "card" ? "creem" : "chinapay";

  const order = await orders.create({
    tenantId: input.organizationId,
    offerId: offer.id,
    // Locked with the product it grants into, so a later catalog edit cannot
    // move a paid order's grant to another product.
    fulfillment: { ...offer.fulfillment, product: offer.product } satisfies LockedFulfillmentSpec,
    amountMinor,
    currency,
    provider,
    method: input.method,
    expiresAt: new Date(Date.now() + ORDER_TTL_MS),
  });

  const checkout = await getCheckout({ provider });
  const session = await checkout.createPaymentSession({
    orderId: order.id,
    organizationId: input.organizationId,
    title: offer.name,
    amountMinor,
    currency,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
    ...(input.method !== "card"
      ? { method: input.method, channel: input.channel, clientIp: input.clientIp }
      : {}),
  });

  if (session.providerRef) {
    await orders.setProviderRef(order.id, session.providerRef);
  }

  return { orderId: order.id, session, amountMinor, currency };
}

// -----------------------------------------------------------------------------
// Settle + fulfill
// -----------------------------------------------------------------------------

export interface SettlePaymentOrderInput {
  orderId: string;
  paidMinor: number;
  currency: string;
  providerRef?: string;
}

export type SettleOutcome = "settled" | "already_settled" | "not_found";

/**
 * A provider reports the order paid. Idempotent: the second report of the
 * same payment settles nothing and fulfills nothing. A payment that does not
 * match the locked price is refused and never fulfilled — it needs a person.
 */
export async function settlePaymentOrder(input: SettlePaymentOrderInput): Promise<SettleOutcome> {
  const orders = requireStore();
  const order = await orders.findById(input.orderId);
  if (!order) return "not_found";

  if (input.paidMinor !== order.amountMinor || input.currency.toUpperCase() !== order.currency) {
    log.error("Payment does not match the order's locked price", {
      orderId: order.id,
      expected: { amountMinor: order.amountMinor, currency: order.currency },
      received: { amountMinor: input.paidMinor, currency: input.currency },
    });
    throw new BillingError("Paid amount does not match the order", "PAYMENT_AMOUNT_MISMATCH", 409);
  }

  const won = await orders.markPaid(order.id, {
    paidMinor: input.paidMinor,
    ...(input.providerRef ? { providerRef: input.providerRef } : {}),
  });

  // Also fulfill when we lost the race: the winner may have crashed between
  // marking PAID and fulfilling. Fulfillment is idempotent on the order id.
  await fulfillPaymentOrder(order.id);
  return won ? "settled" : "already_settled";
}

/** Hand over what was bought. Safe to call any number of times. */
export async function fulfillPaymentOrder(orderId: string): Promise<boolean> {
  const orders = requireStore();
  const order = await orders.findById(orderId);
  if (!order || order.fulfilledAt || order.status !== "PAID") return false;

  const spec = lockedSpec(order);
  await getFulfillment(spec.type).fulfill({
    orderId: order.id,
    organizationId: order.tenantId,
    product: spec.product,
    params: spec.params ?? {},
    amountMinor: order.amountMinor,
    currency: order.currency,
  });
  return orders.markFulfilled(order.id);
}

// -----------------------------------------------------------------------------
// Reconcile
// -----------------------------------------------------------------------------

export interface ReconcileResult {
  checked: number;
  settled: number;
  expired: number;
  fulfilled: number;
  errors: number;
}

/**
 * Wallet notifications get lost — a buyer pays, the callback never lands, and
 * the purchase never arrives. This asks the wallet directly about every order
 * pending past RECONCILE_AFTER_MS, and retries fulfillment for any order paid
 * but not handed over. Wallet orders are asked by out_trade_no, Creem orders by
 * their checkout id; Stripe orders are left to Stripe's own webhook retries.
 */
export async function reconcilePaymentOrders(
  options: { limit?: number; now?: Date } = {},
): Promise<ReconcileResult> {
  const orders = requireStore();
  const limit = options.limit ?? 100;
  const now = options.now ?? new Date();
  const result: ReconcileResult = { checked: 0, settled: 0, expired: 0, fulfilled: 0, errors: 0 };

  const pending = await orders.listPendingCreatedBefore(
    new Date(now.getTime() - RECONCILE_AFTER_MS),
    limit,
  );

  const { queryChinaPayOrder } = await import("../chinapay/index");

  for (const order of pending) {
    result.checked += 1;
    try {
      if (order.provider === "creem" && order.providerRef) {
        const { getCreemCheckout } = await import("../creem/index");
        const checkout = await getCreemCheckout(order.providerRef);
        if (checkout.status === "completed" && checkout.order) {
          const outcome = await settlePaymentOrder({
            orderId: order.id,
            paidMinor: checkout.order.amount,
            currency: checkout.order.currency,
            providerRef: checkout.order.id,
          });
          if (outcome === "settled") result.settled += 1;
          continue;
        }
      }
      if (order.provider === "chinapay") {
        const status = await queryChinaPayOrder(order.id, order.method as "alipay" | "wechat");
        if (status.status === "paid") {
          const outcome = await settlePaymentOrder({
            orderId: order.id,
            paidMinor: status.paidFen,
            currency: "CNY",
            ...(status.providerRef ? { providerRef: status.providerRef } : {}),
          });
          if (outcome === "settled") result.settled += 1;
          continue;
        }
      }
      if (order.expiresAt <= now && (await orders.markExpired(order.id))) {
        result.expired += 1;
      }
    } catch (error) {
      result.errors += 1;
      log.error("Reconcile failed for order", { orderId: order.id, error });
    }
  }

  for (const order of await orders.listPaidUnfulfilled(limit)) {
    try {
      if (await fulfillPaymentOrder(order.id)) result.fulfilled += 1;
    } catch (error) {
      result.errors += 1;
      log.error("Fulfillment retry failed", { orderId: order.id, error });
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// Refund
// -----------------------------------------------------------------------------

export interface RefundPaymentOrderInput {
  orderId: string;
  /** Idempotency key for the provider. Reuse it to retry the same refund. */
  refundId: string;
  /** Defaults to everything not yet refunded. */
  amountMinor?: number;
  reason?: string;
}

export interface RefundPaymentOrderResult {
  status: "succeeded" | "processing" | "failed";
  refundedMinor: number;
  revocation?: RevocationResult;
}

export async function refundPaymentOrder(
  input: RefundPaymentOrderInput,
): Promise<RefundPaymentOrderResult> {
  const orders = requireStore();
  const order = await orders.findById(input.orderId);
  if (!order) {
    throw new BillingError(`Unknown order: ${input.orderId}`, "ORDER_NOT_FOUND", 404);
  }
  if (order.status !== "PAID" && order.status !== "PARTIALLY_REFUNDED") {
    throw new BillingError(
      `Order ${order.id} is ${order.status}, not refundable`,
      "ORDER_NOT_REFUNDABLE",
      409,
    );
  }

  const paidMinor = order.paidMinor ?? order.amountMinor;
  const remaining = paidMinor - order.refundedMinor;
  const amountMinor = input.amountMinor ?? remaining;
  if (!(Number.isInteger(amountMinor) && amountMinor > 0 && amountMinor <= remaining)) {
    throw new BillingError(
      `Refund must be between 1 and ${remaining} minor units`,
      "REFUND_AMOUNT_INVALID",
      400,
    );
  }

  let status: RefundPaymentOrderResult["status"];
  if (order.provider === "chinapay") {
    const { refundChinaPayOrder } = await import("../chinapay/index");
    ({ status } = await refundChinaPayOrder({
      tradeOrderId: order.id,
      refundId: input.refundId,
      method: order.method as "alipay" | "wechat",
      refundFee: toMajorString(amountMinor),
      totalFee: toMajorString(paidMinor),
      reason: input.reason,
    }));
  } else if (order.provider === "creem" && order.providerRef) {
    // Creem refunds a transaction in full and nothing less.
    if (amountMinor !== remaining) {
      throw new BillingError(
        "Creem refunds only the full remaining amount; refund it all or settle the difference outside Creem",
        "REFUND_PARTIAL_UNSUPPORTED",
        400,
      );
    }
    const { refundCreemOrder } = await import("../creem/index");
    ({ status } = await refundCreemOrder(order.providerRef));
  } else if (order.provider === "stripe" && order.providerRef) {
    ({ status } = await refundStripeCheckoutSession({
      sessionId: order.providerRef,
      amountMinor,
      refundId: input.refundId,
    }));
  } else {
    throw new BillingError(
      `Order ${order.id} has no provider payment to refund`,
      "ORDER_NOT_REFUNDABLE",
      409,
    );
  }

  if (status === "failed") {
    return { status, refundedMinor: order.refundedMinor };
  }

  const refundedMinor = order.refundedMinor + amountMinor;
  const recorded = await orders.recordRefund(order.id, {
    previousRefundedMinor: order.refundedMinor,
    refundedMinor,
    fullyRefunded: refundedMinor >= paidMinor,
  });
  if (!recorded) {
    // Another refund landed in between. The provider call above is idempotent
    // on refundId, so the caller can safely retry against the fresh total.
    throw new BillingError(
      "The order changed while refunding; retry with the same refundId",
      "REFUND_CONFLICT",
      409,
    );
  }

  const spec = lockedSpec(order);
  const handler = getFulfillment(spec.type);
  const revocation = handler.revoke
    ? await handler.revoke({
        orderId: order.id,
        organizationId: order.tenantId,
        product: spec.product,
        params: spec.params ?? {},
        amountMinor: order.amountMinor,
        currency: order.currency,
        refundId: input.refundId,
        ratio: amountMinor / paidMinor,
      })
    : undefined;

  return { status, refundedMinor, ...(revocation ? { revocation } : {}) };
}
