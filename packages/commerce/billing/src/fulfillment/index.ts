import { logger } from "@nebutra/logger";
import { addCredits, deductCredits } from "../credits/service";
import { BillingError } from "../types";

// =============================================================================
// Fulfillment — what happens once an order is paid
// =============================================================================
// Keyed by the offer's `fulfillment.type`. A new way of making money is a new
// handler registered here; the payment path does not change.
//
// `fulfill` runs at least once per paid order (webhook, then reconcile if the
// first attempt failed), so it must be idempotent on `orderId`. `revoke` runs
// once per refund and must be idempotent on `refundId`.
// =============================================================================

const log = logger.child({ service: "fulfillment" });

export interface FulfillmentContext {
  orderId: string;
  organizationId: string;
  /** The product the order was locked to; its balance is the only one touched. */
  product: string;
  params: Record<string, unknown>;
  amountMinor: number;
  currency: string;
}

export interface RevocationContext extends FulfillmentContext {
  refundId: string;
  /** Share of the paid amount refunded, 0 < ratio ≤ 1. */
  ratio: number;
}

export interface RevocationResult {
  revoked: boolean;
  reason?: string;
}

export interface FulfillmentHandler {
  fulfill(ctx: FulfillmentContext): Promise<void>;
  /** Omit when nothing can be taken back; the refund still moves the money. */
  revoke?(ctx: RevocationContext): Promise<RevocationResult>;
}

const registry = new Map<string, FulfillmentHandler>();

export function registerFulfillment(type: string, handler: FulfillmentHandler): void {
  registry.set(type, handler);
}

export function getFulfillment(type: string): FulfillmentHandler {
  const handler = registry.get(type);
  if (!handler) {
    throw new BillingError(
      `No fulfillment handler registered for "${type}"`,
      "FULFILLMENT_UNREGISTERED",
      500,
    );
  }
  return handler;
}

function creditsParam(params: Record<string, unknown>): number {
  const credits = params.credits;
  if (!(typeof credits === "number" && Number.isInteger(credits) && credits > 0)) {
    throw new BillingError(
      "credits fulfillment needs a positive integer params.credits",
      "FULFILLMENT_INVALID_PARAMS",
      500,
    );
  }
  return credits;
}

/** Built in: grant credits. The order id is the ledger's idempotency key. */
registerFulfillment("credits", {
  async fulfill(ctx) {
    await addCredits({
      organizationId: ctx.organizationId,
      product: ctx.product,
      amount: creditsParam(ctx.params),
      type: "PURCHASE",
      description: `Purchase (order ${ctx.orderId})`,
      relatedId: ctx.orderId,
    });
  },

  async revoke(ctx) {
    const amount = Math.floor(creditsParam(ctx.params) * ctx.ratio);
    if (amount <= 0) return { revoked: true };
    try {
      await deductCredits({
        organizationId: ctx.organizationId,
        product: ctx.product,
        amount,
        description: `Refund (order ${ctx.orderId})`,
        relatedId: `refund:${ctx.refundId}`,
      });
      return { revoked: true };
    } catch (error) {
      // The buyer already spent them. The money is back regardless; this is
      // reported so a person can decide, not silently absorbed.
      if (error instanceof BillingError && error.code === "INSUFFICIENT_CREDITS") {
        log.warn("Refunded credits were already spent", {
          orderId: ctx.orderId,
          organizationId: ctx.organizationId,
          amount,
        });
        return { revoked: false, reason: "credits_already_spent" };
      }
      throw error;
    }
  },
});

/**
 * `unitsPerMajor[currency]`: how much balance one major unit of the paid
 * currency buys. Router's balance is USD, so `{ USD: 1, CNY: 0.1389 }` — the
 * CNY rate is data in the catalog, locked on the order when it is created.
 */
function balanceGrant(ctx: FulfillmentContext): number {
  const rates = ctx.params.unitsPerMajor as Record<string, unknown> | undefined;
  const rate = rates?.[ctx.currency];
  if (!(typeof rate === "number" && rate > 0)) {
    throw new BillingError(
      `balance fulfillment needs params.unitsPerMajor.${ctx.currency}`,
      "FULFILLMENT_INVALID_PARAMS",
      500,
    );
  }
  // The ledger keeps four decimal places.
  return Math.floor((ctx.amountMinor / 100) * rate * 10_000) / 10_000;
}

/**
 * Built in: top up a money balance with what was paid — an API balance bought
 * by amount rather than by pack (ADR 2026-09-27: Router, like OpenRouter and
 * 302.AI, sells a prepaid balance).
 */
registerFulfillment("balance", {
  async fulfill(ctx) {
    await addCredits({
      organizationId: ctx.organizationId,
      product: ctx.product,
      amount: balanceGrant(ctx),
      type: "PURCHASE",
      description: `Top-up (order ${ctx.orderId})`,
      relatedId: ctx.orderId,
    });
  },

  async revoke(ctx) {
    const amount = Math.floor(balanceGrant(ctx) * ctx.ratio * 10_000) / 10_000;
    if (amount <= 0) return { revoked: true };
    try {
      await deductCredits({
        organizationId: ctx.organizationId,
        product: ctx.product,
        amount,
        description: `Refund (order ${ctx.orderId})`,
        relatedId: `refund:${ctx.refundId}`,
      });
      return { revoked: true };
    } catch (error) {
      if (error instanceof BillingError && error.code === "INSUFFICIENT_CREDITS") {
        log.warn("Refunded balance was already spent", {
          orderId: ctx.orderId,
          organizationId: ctx.organizationId,
          amount,
        });
        return { revoked: false, reason: "balance_already_spent" };
      }
      throw error;
    }
  },
});
