import "server-only";

import { checkoutLink } from "@nebutra/billing/links";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { kuanlanOrigin } from "@/lib/auth-urls";
import { getExpiringCredits, getMembership } from "@/lib/credits";

/**
 * What 观澜 sells, and the way to buy it (ADR 2026-09-27 product wallets).
 *
 * Offers are data in the platform catalog, read from the payment API; paying
 * happens on the one checkout page, which sends the buyer back here. Nothing in
 * this app handles money.
 */

export interface KuanlanOffer {
  id: string;
  name: string;
  kind: "membership" | "credits" | string;
  grants: { credits?: number; tier?: string; days?: number; monthlyCredits?: number };
  prices?: { CNY?: number; USD?: number };
}

type Catalog = Array<KuanlanOffer & { product: string }>;

function apiOrigin(): string {
  return (process.env.NEXT_PUBLIC_API_URL?.trim() || getBrandOrigin("api")).replace(/\/+$/, "");
}

/** The catalog's 观澜 offers; empty when the payment API cannot be reached. */
export async function loadOffers(): Promise<KuanlanOffer[] | null> {
  try {
    const response = await fetch(`${apiOrigin()}/api/v1/billing/offers?product=kuanlan`, {
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    const { offers } = (await response.json()) as { offers: Catalog };
    return offers;
  } catch {
    return null;
  }
}

export function checkoutFor(offerId: string): string {
  return checkoutLink({
    checkoutUrl:
      process.env.NEXT_PUBLIC_CHECKOUT_URL?.trim() || `${getBrandOrigin("app")}/checkout`,
    offerId,
    returnTo: `${kuanlanOrigin()}/pro`,
  });
}

export async function accountOf(tenantId: string) {
  const [membership, expiring] = await Promise.all([
    getMembership(tenantId),
    getExpiringCredits(tenantId),
  ]);
  return { membership, expiring };
}
