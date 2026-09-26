/**
 * Wallet upkeep (ADR 2026-09-27 product wallets).
 *
 * Two hourly jobs keep the expiring part of each product's balance honest:
 *
 * - membership grants: an annual 年卡 pays its credits monthly, like 剪映's
 *   SVIP. Each month is granted once, keyed on the month's start.
 * - lot expiry: credits die when their lot does — a membership month at its
 *   end, a purchased pack after two years. What an expired lot still holds is
 *   taken back with an EXPIRATION row, never more than the balance holds.
 *
 * Grants run first, so a month that starts in the same hour another ends is
 * paid before the old one is taken back.
 */

import { expireCreditLots, grantDueMemberships } from "@nebutra/billing";
import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import type { InngestFunction } from "inngest";
import { inngest } from "../client.js";

// AUDIT(no-tenant): cross-tenant upkeep. It only lists due rows across tenants;
// each grant or expiry is then written on that tenant's own client.
const systemDb = getSystemDb();

const BATCH = 200;

export const walletUpkeep: InngestFunction.Any = inngest.createFunction(
  {
    id: "wallet-upkeep",
    name: "Wallet Upkeep",
    concurrency: { limit: 1 },
    triggers: [{ cron: "7 * * * *" }],
  },
  async ({ step }) => {
    const grants = await step.run("grant-membership-months", () =>
      grantDueMemberships(systemDb, { limit: BATCH }),
    );
    const expiry = await step.run("expire-credit-lots", () =>
      expireCreditLots(systemDb, { limit: BATCH }),
    );
    if (grants.errors > 0 || expiry.errors > 0) {
      logger.warn("Wallet upkeep had failures", { grants, expiry });
    }
    return { grants, expiry };
  },
);
