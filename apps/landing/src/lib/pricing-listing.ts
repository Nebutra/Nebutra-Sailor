import type { PublicOffer } from "./public-offers";

/**
 * Products whose offers exist in the catalog (and still check out) but are not
 * shown on /pricing yet. Kuanlan and Para are not launching: the offers stay in
 * ops/nebutra/offers.json, untouched; only the public price page leaves them out.
 * Remove the id here to list them again.
 */
export const UNLISTED_PRICING_PRODUCTS: ReadonlySet<string> = new Set(["kuanlan", "para"]);

export function listedOffers(offers: readonly PublicOffer[]): PublicOffer[] {
  return offers.filter((offer) => !UNLISTED_PRICING_PRODUCTS.has(offer.product));
}
