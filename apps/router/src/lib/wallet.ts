import "server-only";

import { configureBillingTenantDb } from "@nebutra/billing";
import * as credits from "@nebutra/billing/credits";
import { getTenantDb } from "@nebutra/db";
import { createCreditLedgerWallet, type PrepaidWallet } from "@nebutra/prepaid-wallet";

/**
 * The Router's one wallet: `CreditBalance` / `CreditTransaction`, keyed by
 * `Tenant.id` (the personal tenant for an individual, the org tenant otherwise
 * — `CreditBalance.tenantId` is unique and FK'd to `Tenant`, so both work).
 *
 * There is no demo wallet. `MemoryPrepaidWallet` is a test double and is never
 * constructed here.
 *
 * `@nebutra/billing` needs its tenant DB configured before any credits call.
 * `src/instrumentation.ts` does that at boot, but boot and a request handler do
 * not always share a module instance in a bundled build: `/v1/limits` reached a
 * copy of `@nebutra/billing` that had never been configured and threw
 * "requires a host tenant DB" as a 500, on our own published endpoint.
 *
 * So the wallet configures it on the way to first use instead. Registration is
 * idempotent, and tying it to the thing that needs it removes the question of
 * whether a boot hook ran in this instance.
 *
 * ## Reading a balance
 *
 * `@nebutra/billing` keeps `balanceCache`, a module-level Map with a 60s TTL,
 * in front of the balance. That is fine for a dashboard and wrong for a spend
 * decision: on a second instance it can report money the first instance has
 * already spent. So this module exposes the split explicitly —
 * {@link getBalanceForDisplay} for UI, {@link getBalanceFresh} /
 * {@link hasBalanceFresh} for anything that admits a request. Both mutations
 * invalidate the cache before re-reading.
 */
let wallet: PrepaidWallet | undefined;

export function getWallet(): PrepaidWallet {
  if (!wallet) {
    configureBillingTenantDb(getTenantDb);
    wallet = createCreditLedgerWallet({
      getCreditBalance: credits.getCreditBalance,
      getCreditBalanceFresh: credits.getCreditBalanceFresh,
      invalidateCreditCache: credits.invalidateCreditCache,
      addCredits: credits.addCredits,
      deductCredits: credits.deductCredits,
    });
  }
  return wallet;
}

/** Cached read. Dashboards and wallet pages only — never a spend decision. */
export function getBalanceForDisplay(tenantId: string) {
  return getWallet().getBalance(tenantId);
}

/** Uncached read. Use this on every admit/guard path. */
export function getBalanceFresh(tenantId: string) {
  return getWallet().getBalanceFresh(tenantId);
}

/** Uncached check. Use this, not `hasBalance`, before spending. */
export function hasBalanceFresh(tenantId: string, amount: number) {
  return getWallet().hasBalanceFresh(tenantId, amount);
}
