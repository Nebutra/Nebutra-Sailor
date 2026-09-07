import "server-only";

import {
  addBonusCredits,
  configureBillingTenantDb,
  deductCredits,
  getCreditAllowanceForPlan,
  getCreditBalance,
  getCreditTransactions,
  refundCredits,
} from "@nebutra/billing";
import { getTenantDb } from "@nebutra/db";

/**
 * Credits for 观澜, on the platform's ledger.
 *
 * `@nebutra/billing` never imports `@nebutra/db`; the host hands it a
 * tenant-scoped client getter once, and every balance read and deduction then
 * runs under the same `SET LOCAL ROLE app_user` as everything else here.
 * `getTenantDb` fits the getter's shape exactly, so this is the whole wiring.
 *
 * The ledger is per tenant, which is why every person has one (see db.ts).
 */
configureBillingTenantDb(getTenantDb);

/** 1 credit = $0.01. The price of one shoot, tunable without a deploy. */
export const DEFAULT_SHOOT_PRICE_CREDITS = 100;

export function shootPriceCredits(): number {
  const raw = Number.parseInt(process.env.KUANLAN_SHOOT_PRICE_CREDITS ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SHOOT_PRICE_CREDITS;
}

export type ShootReservation = { transactionId: string; balanceAfter: number };

/** Thrown before the model is called; the caller answers 402. */
export class InsufficientCreditsError extends Error {
  readonly balance: number;
  readonly price: number;
  constructor(balance: number, price: number) {
    super("insufficient_credits");
    this.name = "InsufficientCreditsError";
    this.balance = balance;
    this.price = price;
  }
}

/**
 * Reserve the price of a shoot before the model is called.
 *
 * `deductCredits` checks and deducts inside one transaction, so two shoots
 * racing for the last credits cannot both be admitted — the gap the platform's
 * cache-based balance guard still has (docs/ops/cost-guardrails.md) is closed
 * here at the ledger. `relatedId` is the Task id, which is what makes the refund
 * on failure findable later.
 */
export async function reserveShootCredits(
  tenantId: string,
  taskId: string,
): Promise<ShootReservation> {
  const price = shootPriceCredits();
  try {
    const tx = await deductCredits({
      organizationId: tenantId,
      amount: price,
      description: "开拍",
      relatedId: taskId,
      metadata: { app: "kuanlan", taskId },
    });
    return { transactionId: tx.id, balanceAfter: tx.balanceAfter };
  } catch (error) {
    if (isBillingCode(error, "INSUFFICIENT_CREDITS")) {
      const { balance } = await getCreditBalance(tenantId);
      throw new InsufficientCreditsError(balance, price);
    }
    throw error;
  }
}

/**
 * No output, no charge — once.
 *
 * `refundCredits` is `addCredits(type: "REFUND")` and does not know whether it
 * already ran for this Task; a retry of the failure path would pay twice. So the
 * ledger is asked first: a REFUND row carrying this Task id means the money is
 * already back, and this returns it rather than adding another.
 */
export async function refundShootCredits(
  tenantId: string,
  taskId: string,
  reason: string,
): Promise<{ refunded: boolean; balanceAfter: number }> {
  // Filtered at the ledger, not in memory: a person with a long history must
  // not slip past a 50-row page and be refunded twice.
  const refunds = await getCreditTransactions(tenantId, { type: "REFUND", limit: 100 });
  const already = refunds.find((t) => t.relatedId === taskId);
  if (already) {
    return { refunded: false, balanceAfter: already.balanceAfter };
  }

  const tx = await refundCredits({
    organizationId: tenantId,
    amount: shootPriceCredits(),
    reason,
    relatedId: taskId,
  });
  return { refunded: true, balanceAfter: tx.balanceAfter };
}

/**
 * What a new person starts with: the platform's FREE allowance, granted once.
 *
 * `getCreditBalance` creates the ledger row at zero on first read; without this
 * nobody could take a single shot. The FREE plan describes a monthly figure
 * with a daily refresh, which needs a scheduler this app does not have yet —
 * so the monthly amount is granted once, and the refresh is the follow-up
 * noted in the roadmap. Idempotent: a BONUS row with this marker means it has
 * already happened.
 */
/**
 * `addBonusCredits` carries no `relatedId` or metadata — only a reason, which
 * lands in the row's `description`. So the reason string doubles as the
 * idempotency marker and must never be reworded casually: changing it would
 * grant everyone a second welcome.
 */
export const WELCOME_GRANT_MARKER = "kuanlan.welcome";

export async function ensureWelcomeCredits(tenantId: string): Promise<{ granted: boolean }> {
  const bonuses = await getCreditTransactions(tenantId, { type: "BONUS", limit: 100 });
  if (bonuses.some((t) => t.description === WELCOME_GRANT_MARKER)) {
    return { granted: false };
  }
  const { includedMonthly } = getCreditAllowanceForPlan("FREE");
  if (includedMonthly <= 0) return { granted: false };

  await addBonusCredits({
    organizationId: tenantId,
    amount: includedMonthly,
    reason: WELCOME_GRANT_MARKER,
  });
  return { granted: true };
}

export async function creditBalance(tenantId: string): Promise<number> {
  return (await getCreditBalance(tenantId)).balance;
}

function isBillingCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}
