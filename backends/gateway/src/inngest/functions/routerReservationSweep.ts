/**
 * Router reservation sweep.
 *
 * The Router holds the worst-case charge in the tenant balance before it calls
 * upstream, and records that hold as a `router_reservations` row. A request
 * that never settles — the machine was recycled mid-stream, the process was
 * OOM-killed — leaves the money out of the balance until the row is returned.
 *
 * The Router's own admit path sweeps the calling tenant first, so an active
 * customer is made whole on their next request with no scheduled job at all.
 * This function exists for the customer who stops calling: it returns every
 * hold past `expires_at`, whoever owns it, and writes a `CreditTransaction` for
 * each so the balance never moves without a row explaining why.
 *
 * Refunding is idempotent: the row delete is the lease, so a run that overlaps
 * the previous one, or the Router's own sweep, refunds each hold exactly once.
 */

import { invalidateCreditCache } from "@nebutra/billing/credits";
import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { RouterBillingRepository } from "@nebutra/repositories";
import type { InngestFunction } from "inngest";
import { inngest } from "../client.js";

// AUDIT(no-tenant): a cross-tenant maintenance pass over money the platform is
// holding on behalf of every tenant. Same posture as gdprDeletion — no request
// tenant exists, and scoping it to one would defeat the purpose.
const systemDb = getSystemDb();

/** Ceiling per run. At one transaction per row this stays a short job. */
const SWEEP_BATCH = 500;

export const routerReservationSweep: InngestFunction.Any = inngest.createFunction(
  {
    id: "router-reservation-sweep",
    name: "Router Reservation Sweep",
    concurrency: { limit: 1 },
    // Every ten minutes. Holds expire 15 minutes after they are taken, so an
    // abandoned one is returned within ~25 minutes at worst — money, not a
    // retention chore, which is why this runs more often than the hourly sweeps.
    triggers: [{ cron: "*/10 * * * *" }],
  },
  async ({ step }) => {
    const result = await step.run("return-expired-holds", async () => {
      const repository = new RouterBillingRepository(systemDb);
      const swept = await repository.sweepExpired({ limit: SWEEP_BATCH });
      for (const tenantId of swept.tenantIds) invalidateCreditCache(tenantId);
      return swept;
    });

    if (result.swept > 0) {
      logger.warn("Router reservation sweep returned expired holds", {
        swept: result.swept,
        refunded: result.refunded,
        tenants: result.tenantIds.length,
      });
    }
    return result;
  },
);
