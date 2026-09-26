import { checkoutLink } from "@nebutra/billing/links";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { paraOrigin } from "@/lib/auth-urls";

/**
 * PARA's side of the product wallets (ADR 2026-09-27): what it sells, read from
 * the payment API, and links into the one checkout page. PARA handles no money;
 * its credits and memberships belong to the active organization.
 */

export const WALLET_PRODUCT = "para";

// Read here rather than from gateway-api.ts, which is a client module: a server
// component importing it would get a client reference, not the string.
const GATEWAY_URL = process.env.NEXT_PUBLIC_PARA_API_URL ?? "";

export interface ParaOffer {
  id: string;
  name: string;
  kind: string;
  grants: { credits?: number; tier?: string; days?: number; monthlyCredits?: number };
  prices?: { CNY?: number; USD?: number };
}

export function checkoutFor(offerId: string): string {
  return checkoutLink({
    checkoutUrl:
      process.env.NEXT_PUBLIC_CHECKOUT_URL?.trim() || `${getBrandOrigin("app")}/checkout`,
    offerId,
    returnTo: `${paraOrigin()}/pro`,
  });
}

export async function loadOffers(): Promise<ParaOffer[] | null> {
  if (!GATEWAY_URL) return null;
  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/billing/offers?product=${WALLET_PRODUCT}`, {
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return ((await res.json()) as { offers: ParaOffer[] }).offers;
  } catch {
    return null;
  }
}

export function priceLabel(offer: ParaOffer): string {
  const parts: string[] = [];
  if (offer.prices?.USD !== undefined) parts.push(`$${offer.prices.USD}`);
  if (offer.prices?.CNY !== undefined) parts.push(`¥${offer.prices.CNY}`);
  return parts.join(" · ");
}
