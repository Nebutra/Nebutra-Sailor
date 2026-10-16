/**
 * Wire host DB into @nebutra/license once per process for landing API routes,
 * and the order store + the one offer /api/license sells.
 *
 * The Team support plan (tier `STARTUP`) is paid by card through Creem, the
 * merchant of record (ADR 2026-09-26). The order lands in the shared payment
 * order table; the gateway's Creem webhook (or the buyer's return) settles it
 * and its `license` fulfillment issues the license.
 */
import { configureOffers, configurePaymentOrderStore, type Offer } from "@nebutra/billing";
import { getSystemDb } from "@nebutra/db";
import { configureLicenseSystemDb } from "@nebutra/license";
import { PaymentOrderRepository } from "@nebutra/repositories";

export const TEAM_LICENSE_OFFER: Offer = {
  id: "license_team_annual",
  product: "license",
  account: "personal",
  name: "Sailor Team support — 1 year",
  prices: { USD: 2000 },
  fulfillment: { type: "license", params: { tier: "STARTUP" } },
};

configureLicenseSystemDb(getSystemDb);
configurePaymentOrderStore(new PaymentOrderRepository(getSystemDb()));
configureOffers([TEAM_LICENSE_OFFER]);
