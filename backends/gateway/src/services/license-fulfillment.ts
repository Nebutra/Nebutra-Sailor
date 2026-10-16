/**
 * Fulfillment for a support-plan purchase (the Team tier, `STARTUP` in the
 * license schema), paid by card through Creem like every other order
 * (ADR 2026-09-26). It replaces the Stripe checkout `/api/license` used to
 * open, whose webhook issued the license from session metadata.
 *
 * The order is placed on the buyer's personal tenant, so the tenant row names
 * the person. The community profile the wizard saved before checkout supplies
 * the GitHub handle; the license itself is idempotent per user and tier, so a
 * webhook and a return-verify that both settle never issue two.
 */

import { BillingError, registerFulfillment } from "@nebutra/billing";
import { getSystemDb } from "@nebutra/db";
import { issueLicense } from "@nebutra/license";
import { logger } from "@nebutra/logger";
import { UserRepository } from "@nebutra/repositories";

const log = logger.child({ service: "license-fulfillment" });

/** Tiers a payment can grant. The free tiers are issued without one. */
const PAID_TIERS = new Set(["STARTUP"]);

export const LICENSE_FULFILLMENT = "license";

registerFulfillment(LICENSE_FULFILLMENT, {
  async fulfill(ctx) {
    const tier = ctx.params.tier;
    if (!(typeof tier === "string" && PAID_TIERS.has(tier))) {
      throw new BillingError(
        `license fulfillment needs params.tier in ${[...PAID_TIERS].join(", ")}`,
        "FULFILLMENT_INVALID_PARAMS",
        500,
      );
    }

    // AUDIT(no-tenant): the tenants table is what tenant scoping derives from;
    // a personal tenant's owner is read before any tenant context exists.
    const db = getSystemDb();
    const tenant = await db.tenant.findUnique({
      where: { id: ctx.organizationId },
      select: { userId: true },
    });
    if (!tenant?.userId) {
      throw new BillingError(
        "license orders are placed on the buyer's personal tenant",
        "FULFILLMENT_INVALID_TENANT",
        500,
      );
    }
    const userId = tenant.userId;

    const [user, profile] = await Promise.all([
      new UserRepository(db).findById(userId),
      // AUDIT(no-tenant): community profiles are user-scoped (see /api/license).
      db.communityProfile.findUnique({ where: { userId }, select: { githubHandle: true } }),
    ]);
    const email = user?.email ?? null;

    const license = await issueLicense({
      userId,
      tier: tier as "STARTUP",
      displayName: user?.name ?? email?.split("@")[0] ?? "Founder",
      email,
      githubHandle: profile?.githubHandle ?? null,
    });
    log.info("Paid license issued", { orderId: ctx.orderId, userId, licenseId: license.id });
  },
});
