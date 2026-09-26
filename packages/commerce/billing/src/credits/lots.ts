import { logger } from "@nebutra/logger";
import { type BillingTenantDb, requireTenantDb } from "../db";
import { type CreditLotSource, invalidateCreditCache, type WalletProduct } from "./service";

// =============================================================================
// Credit lots — the expiring part of a balance
// =============================================================================
// ADR 2026-09-27 product wallets. A balance is one number; the lots say which
// part of it expires when. Spends draw on the soonest-expiring lot first
// (credits/service.ts), and this job takes back what a lot still holds once it
// has expired, writing an EXPIRATION row so the ledger explains the drop.
// =============================================================================

const log = logger.child({ service: "credit-lots" });

export interface ExpiringCredits {
  source: CreditLotSource;
  remaining: number;
  expiresAt: Date;
}

/** The expiring part of one product's balance, soonest first. For "3,200 expire on …". */
export async function getExpiringCredits(
  organizationId: string,
  product: WalletProduct,
): Promise<ExpiringCredits[]> {
  const db = requireTenantDb(organizationId);
  const lots = await db.creditLot.findMany({
    where: {
      creditBalance: { tenantId: organizationId, product },
      remaining: { gt: 0 },
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "asc" },
  });
  return (lots as Array<{ source: CreditLotSource; remaining: unknown; expiresAt: Date }>).map(
    (lot) => ({ source: lot.source, remaining: Number(lot.remaining), expiresAt: lot.expiresAt }),
  );
}

export interface ExpireResult {
  expired: number;
  errors: number;
}

/**
 * Take back what expired lots still hold. `systemDb` lists due lots across
 * every tenant; each is then settled on that tenant's own client, inside one
 * transaction that locks the balance row first — the same order a spend takes
 * its locks in, so the two cannot deadlock. Never takes more than the balance
 * holds: a product whose spend path does not draw on lots (Router's holds)
 * can leave a lot looking fuller than it is.
 */
export async function expireCreditLots(
  systemDb: BillingTenantDb,
  options: { now?: Date; limit?: number } = {},
): Promise<ExpireResult> {
  const now = options.now ?? new Date();
  const due = (await systemDb.creditLot.findMany({
    where: { expiresAt: { lte: now }, remaining: { gt: 0 } },
    include: { creditBalance: { select: { tenantId: true, product: true } } },
    orderBy: { expiresAt: "asc" },
    take: options.limit ?? 200,
  })) as Array<{
    id: string;
    creditBalanceId: string;
    creditBalance: { tenantId: string; product: string };
  }>;

  const result: ExpireResult = { expired: 0, errors: 0 };
  for (const lot of due) {
    const { tenantId, product } = lot.creditBalance;
    try {
      await requireTenantDb(tenantId).$transaction(async (tx: BillingTenantDb) => {
        // Lock the balance row before reading the lot, as a spend does.
        await tx.creditBalance.updateMany({
          where: { id: lot.creditBalanceId },
          data: { balance: { increment: 0 } },
        });
        const fresh = await tx.creditLot.findUnique({ where: { id: lot.id } });
        const balance = await tx.creditBalance.findUnique({ where: { id: lot.creditBalanceId } });
        if (!fresh || !balance || Number(fresh.remaining) <= 0) return;

        const amount = Math.min(Number(fresh.remaining), Number(balance.balance));
        await tx.creditLot.update({ where: { id: lot.id }, data: { remaining: 0 } });
        if (amount <= 0) return;

        const updated = await tx.creditBalance.update({
          where: { id: lot.creditBalanceId },
          data: { balance: { decrement: amount } },
        });
        await tx.creditTransaction.create({
          data: {
            creditBalanceId: lot.creditBalanceId,
            type: "EXPIRATION",
            amount: -amount,
            balanceAfter: updated.balance,
            description: `Expired (${fresh.source.toLowerCase()} credits)`,
            relatedId: `expire:${lot.id}`,
            metadata: { lotId: lot.id, expiresAt: fresh.expiresAt.toISOString() },
          },
        });
      });
      invalidateCreditCache(tenantId, product);
      result.expired += 1;
    } catch (error) {
      result.errors += 1;
      log.error("Expiring a credit lot failed", { lotId: lot.id, tenantId, product, error });
    }
  }
  return result;
}
