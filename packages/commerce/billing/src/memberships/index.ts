import { logger } from "@nebutra/logger";
import { grantInTx, invalidateCreditCache, type WalletProduct } from "../credits/service";
import { type BillingTenantDb, requireTenantDb } from "../db";
import { BillingError } from "../types";

// =============================================================================
// Memberships — a product's paid tier for a period
// =============================================================================
// ADR 2026-09-27 product wallets. Kuanlan and Para sell a membership the way
// 剪映 and LibTV do: a tier for a period, which unlocks features and grants
// credits every month; the credits die at the end of their month. For now a
// period is bought outright (a 月卡 / 年卡); auto-renew comes with Creem
// subscriptions and, later, Alipay / WeChat recurring deduction.
//
// One row per organization per product. Buying the tier you already hold
// extends it; buying another tier replaces it from now.
// =============================================================================

const log = logger.child({ service: "memberships" });

const DAY_MS = 24 * 60 * 60 * 1000;
/** A membership grants its credits per 30-day month, like 剪映's 订阅积分. */
export const GRANT_PERIOD_DAYS = 30;

export interface Membership {
  organizationId: string;
  product: WalletProduct;
  tier: string;
  startsAt: Date;
  endsAt: Date;
  monthlyCredits: number;
}

interface MembershipRow {
  id: string;
  tenantId: string;
  product: string;
  tier: string;
  startsAt: Date;
  endsAt: Date;
  monthlyCredits: number;
  nextGrantAt: Date | null;
  appliedOrders: string[];
}

function toMembership(row: MembershipRow): Membership {
  return {
    organizationId: row.tenantId,
    product: row.product,
    tier: row.tier,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    monthlyCredits: row.monthlyCredits,
  };
}

/** The organization's current membership of a product, or null when it has none or it ended. */
export async function getMembership(
  organizationId: string,
  product: WalletProduct,
  now: Date = new Date(),
): Promise<Membership | null> {
  const row = (await requireTenantDb(organizationId).membership.findUnique({
    where: { tenantId_product: { tenantId: organizationId, product } },
  })) as MembershipRow | null;
  return row && row.endsAt > now ? toMembership(row) : null;
}

export interface MembershipPurchase {
  orderId: string;
  organizationId: string;
  product: WalletProduct;
  tier: string;
  days: number;
  monthlyCredits: number;
  now?: Date;
}

function grantWindow(from: Date, endsAt: Date): { expiresAt: Date; next: Date | null } {
  const monthEnd = new Date(from.getTime() + GRANT_PERIOD_DAYS * DAY_MS);
  return monthEnd < endsAt
    ? { expiresAt: monthEnd, next: monthEnd }
    : { expiresAt: endsAt, next: null };
}

/**
 * Apply a paid membership order. Idempotent on the order id: the id is
 * recorded on the row in the same transaction that extends the period and
 * grants the first month's credits.
 */
export async function applyMembershipPurchase(purchase: MembershipPurchase): Promise<void> {
  if (!(Number.isInteger(purchase.days) && purchase.days > 0)) {
    throw new BillingError(
      "A membership needs a positive number of days",
      "MEMBERSHIP_INVALID",
      500,
    );
  }
  const now = purchase.now ?? new Date();
  const key = { tenantId: purchase.organizationId, product: purchase.product };

  await requireTenantDb(purchase.organizationId).$transaction(async (tx: BillingTenantDb) => {
    const current = (await tx.membership.findUnique({
      where: { tenantId_product: key },
    })) as MembershipRow | null;
    if (current?.appliedOrders.includes(purchase.orderId)) return;

    const length = purchase.days * DAY_MS;
    const extending = current !== null && current.endsAt > now && current.tier === purchase.tier;

    if (extending) {
      // Same tier, still running: the new period starts where the old one ends,
      // and its months are granted by the job as they arrive.
      const endsAt = new Date(current.endsAt.getTime() + length);
      await tx.membership.update({
        where: { id: current.id },
        data: {
          endsAt,
          nextGrantAt: current.nextGrantAt ?? current.endsAt,
          appliedOrders: { push: purchase.orderId },
        },
      });
      return;
    }

    // New, lapsed, or a different tier: it starts now and the first month is
    // granted at once. A different tier replaces the old one outright.
    const endsAt = new Date(now.getTime() + length);
    const window = grantWindow(now, endsAt);
    const data = {
      tier: purchase.tier,
      startsAt: now,
      endsAt,
      monthlyCredits: purchase.monthlyCredits,
      nextGrantAt: window.next,
    };
    if (current) {
      await tx.membership.update({
        where: { id: current.id },
        data: { ...data, appliedOrders: { push: purchase.orderId } },
      });
    } else {
      await tx.membership.create({ data: { ...key, ...data, appliedOrders: [purchase.orderId] } });
    }
    if (purchase.monthlyCredits > 0) {
      await grantInTx(tx, {
        organizationId: purchase.organizationId,
        product: purchase.product,
        amount: purchase.monthlyCredits,
        type: "PURCHASE",
        description: `${purchase.tier} membership credits`,
        relatedId: purchase.orderId,
        lot: { source: "SUBSCRIPTION", expiresAt: window.expiresAt },
      });
    }
  });
  invalidateCreditCache(purchase.organizationId, purchase.product);
}

/**
 * A refund shortens the membership by the refunded share of what the order
 * bought, never into the past, and forgets the order. Credits already granted
 * by it are taken back by the caller through the ledger.
 */
export async function revokeMembershipPurchase(input: {
  orderId: string;
  organizationId: string;
  product: WalletProduct;
  days: number;
  ratio: number;
  now?: Date;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  return requireTenantDb(input.organizationId).$transaction(async (tx: BillingTenantDb) => {
    const current = (await tx.membership.findUnique({
      where: { tenantId_product: { tenantId: input.organizationId, product: input.product } },
    })) as MembershipRow | null;
    if (!current?.appliedOrders.includes(input.orderId)) return false;
    const shortened = new Date(current.endsAt.getTime() - input.days * input.ratio * DAY_MS);
    const endsAt = shortened > now ? shortened : now;
    await tx.membership.update({
      where: { id: current.id },
      data: {
        endsAt,
        nextGrantAt:
          current.nextGrantAt && current.nextGrantAt < endsAt ? current.nextGrantAt : null,
        appliedOrders: current.appliedOrders.filter((id) => id !== input.orderId),
      },
    });
    return true;
  });
}

export interface GrantResult {
  granted: number;
  errors: number;
}

/**
 * Grant the month's credits to every membership whose next month has begun —
 * an annual 年卡 pays out monthly, like 剪映's SVIP. Keyed on the month's start,
 * so a rerun grants nothing twice.
 */
export async function grantDueMemberships(
  systemDb: BillingTenantDb,
  options: { now?: Date; limit?: number } = {},
): Promise<GrantResult> {
  const now = options.now ?? new Date();
  const due = (await systemDb.membership.findMany({
    where: { nextGrantAt: { lte: now } },
    orderBy: { nextGrantAt: "asc" },
    take: options.limit ?? 200,
  })) as MembershipRow[];

  const result: GrantResult = { granted: 0, errors: 0 };
  for (const row of due) {
    try {
      await requireTenantDb(row.tenantId).$transaction(async (tx: BillingTenantDb) => {
        const fresh = (await tx.membership.findUnique({
          where: { id: row.id },
        })) as MembershipRow | null;
        const start = fresh?.nextGrantAt;
        if (!fresh || !start || start > now) return;
        if (start >= fresh.endsAt) {
          await tx.membership.update({ where: { id: row.id }, data: { nextGrantAt: null } });
          return;
        }
        const window = grantWindow(start, fresh.endsAt);
        if (fresh.monthlyCredits > 0) {
          await grantInTx(tx, {
            organizationId: fresh.tenantId,
            product: fresh.product,
            amount: fresh.monthlyCredits,
            type: "BONUS",
            description: `${fresh.tier} membership credits`,
            relatedId: `membership:${fresh.id}:${start.toISOString()}`,
            lot: { source: "SUBSCRIPTION", expiresAt: window.expiresAt },
          });
        }
        await tx.membership.update({
          where: { id: row.id },
          data: { nextGrantAt: window.next },
        });
      });
      invalidateCreditCache(row.tenantId, row.product);
      result.granted += 1;
    } catch (error) {
      result.errors += 1;
      log.error("Granting membership credits failed", { membershipId: row.id, error });
    }
  }
  return result;
}
