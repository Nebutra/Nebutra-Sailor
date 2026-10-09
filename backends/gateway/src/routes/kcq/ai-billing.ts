/**
 * KCQ managed-AI billing: the Router's money path, run for the KCQ product wallet.
 *
 * There is no second implementation of money here. Prices come from the same
 * published `model_configs` rows the Router charges and the shelf quotes
 * (`RouterBillingRepository.findPrice`, resolved by the shared `priceUsage` /
 * `reserveWorstCase`), and the hold / settle / release / sweep spine is
 * `RouterBillingRepository` itself, called with `product: "kcq"` (ADR
 * 2026-09-27 product wallets: a balance per product, never crossing). This file
 * only decides the KCQ-specific things: which tenant pays, what a request id is,
 * and what an estimate looks like.
 *
 * Flow for a customer (non-staff) call:
 *   quote   -> published price of the model about to be served, else refuse (503)
 *   reserve -> atomic conditional decrement of the KCQ balance, 402 if short
 *   serve   -> forward to Router; any failure releases the hold, nothing debited
 *   settle  -> actual cost from the usage the upstream returned, one transaction
 *              (ledger row + refund of the unspent hold + credit transaction)
 *
 * Ledger rows carry `metadata.product = "kcq"`, so Router's usage console (which
 * filters `metadata.product = 'router'`) never shows them and KCQ's usage page and
 * reconciliation can select exactly them.
 */
import { getSystemDb } from "@nebutra/db";
import { RouterBillingRepository } from "@nebutra/repositories";
import {
  MIN_REQUEST_CHARGE_USD,
  type PriceResult,
  priceUsage,
  reserveWorstCase,
  toModelPriceRow,
} from "@nebutra/router-supply";

export const KCQ_WALLET_PRODUCT = "kcq";

/** The slice of the money seam this route uses; a fake satisfies it in tests. */
export type KcqAiBilling = Pick<
  RouterBillingRepository,
  "findPrice" | "reserve" | "release" | "settle" | "isSettled"
>;

export function defaultKcqAiBilling(): KcqAiBilling {
  // AUDIT(no-tenant): the money spine writes balances and the ledger for a tenant
  // resolved from the verified session; it is the same system-client seam Router uses.
  return new RouterBillingRepository(getSystemDb());
}

/** Rough prompt size: JSON length over four, the estimator Router's edge uses. */
const CHARS_PER_TOKEN = 4;
export function estimatePromptTokens(body: unknown): number {
  try {
    return Math.ceil(JSON.stringify(body).length / CHARS_PER_TOKEN);
  } catch {
    return 0;
  }
}

export type KcqQuote =
  | { ok: true; reserve: number; priceRow: ReturnType<typeof toModelPriceRow> }
  | { ok: false; reason: "unpriced" };

/** Price the worst case of this request at the model's published shelf rate. */
export async function quoteKcqRequest(
  billing: KcqAiBilling,
  model: string,
  input: { promptTokens: number; maxOutputTokens: number },
): Promise<KcqQuote> {
  const row = await billing.findPrice(model);
  if (!row || !row.published || !row.isActive) return { ok: false, reason: "unpriced" };
  const priceRow = toModelPriceRow(row);
  const worst = reserveWorstCase(model, input, priceRow);
  if (!worst.ok) return { ok: false, reason: "unpriced" };
  return { ok: true, reserve: Math.max(MIN_REQUEST_CHARGE_USD, worst.totalCost), priceRow };
}

export interface KcqUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface KcqSettlement {
  charged: number;
  /** True when usage could not be read and the held amount was charged instead. */
  fellBackToReservation: boolean;
}

function priced(
  model: string,
  usage: KcqUsage,
  priceRow: ReturnType<typeof toModelPriceRow>,
): PriceResult {
  return priceUsage(
    model,
    { promptTokens: usage.promptTokens, completionTokens: usage.completionTokens, calls: 1 },
    priceRow,
  );
}

/**
 * Close a hold at the actual cost. With readable usage the customer pays for
 * exactly what was used (floored at the minimum charge). Without it, a success
 * we cannot meter is charged the held worst case: the upstream billed us either
 * way, and the customer's balance was checked against that figure before the call.
 */
export async function settleKcqRequest(
  billing: KcqAiBilling,
  input: {
    tenantId: string;
    userId: string;
    requestId: string;
    idempotencyKey: string;
    model: string;
    reserved: number;
    priceRow: ReturnType<typeof toModelPriceRow>;
    usage: KcqUsage | null;
    latencyMs: number;
    clientRequestId: string | null;
  },
): Promise<KcqSettlement> {
  let unitCost = 0;
  let quantity = 1;
  let unit = "request";
  let totalCost = input.reserved;
  let fellBack = true;
  if (input.usage && input.usage.promptTokens + input.usage.completionTokens > 0) {
    const result = priced(input.model, input.usage, input.priceRow);
    if (result.ok) {
      fellBack = false;
      totalCost = Math.max(MIN_REQUEST_CHARGE_USD, result.totalCost);
      quantity = input.usage.promptTokens + input.usage.completionTokens;
      unit = "token";
      unitCost = quantity > 0 ? totalCost / quantity : 0;
    }
  }
  if (fellBack) unitCost = totalCost;

  await billing.settle({
    tenantId: input.tenantId,
    userId: input.userId,
    keyId: null,
    product: KCQ_WALLET_PRODUCT,
    requestId: input.requestId,
    idempotencyKey: input.idempotencyKey,
    model: input.model,
    quantity,
    unit,
    unitCost,
    totalCost,
    currency: "USD",
    reserved: input.reserved,
    metadata: {
      product: KCQ_WALLET_PRODUCT,
      path: "/chat/completions",
      requestId: input.clientRequestId ?? input.requestId,
      promptTokens: input.usage?.promptTokens ?? null,
      completionTokens: input.usage?.completionTokens ?? null,
      latencyMs: input.latencyMs,
      reserved: input.reserved,
      ...(fellBack ? { unpriced: "usage_unreadable" } : {}),
    },
  });
  return { charged: totalCost, fellBackToReservation: fellBack };
}
