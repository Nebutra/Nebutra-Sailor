import { BillingError } from "../types";

// =============================================================================
// Offers — what can be bought, and for how much
// =============================================================================
// An offer is data, not code: an id, a price per currency, and a fulfillment
// spec naming what the buyer receives once paid. The payment path never knows
// whether it is selling credits, a plan or a licence — it resolves an offer,
// charges its price, and hands the spec to the fulfillment registry.
//
// The host replaces the catalog with `configureOffers()` at boot. The default
// below is the template's starting point, not a business decision.
// =============================================================================

export type OfferCurrency = "USD" | "CNY";

export interface FulfillmentSpec {
  /** Key into the fulfillment registry, e.g. "credits". */
  type: string;
  params: Record<string, unknown>;
}

export interface Offer {
  id: string;
  name: string;
  /** Major units per currency. A currency left out cannot buy this offer. */
  prices: Partial<Record<OfferCurrency, number>>;
  fulfillment: FulfillmentSpec;
  /** Display only: shown as a badge, never read by the payment path. */
  highlight?: string;
  active?: boolean;
}

export const DEFAULT_OFFERS: readonly Offer[] = [
  {
    id: "credits_10k",
    name: "10,000 credits",
    prices: { USD: 10, CNY: 68 },
    fulfillment: { type: "credits", params: { credits: 10_000 } },
  },
  {
    id: "credits_55k",
    name: "55,000 credits",
    prices: { USD: 50, CNY: 348 },
    fulfillment: { type: "credits", params: { credits: 55_000 } },
    highlight: "5,000 bonus",
  },
  {
    id: "credits_250k",
    name: "250,000 credits",
    prices: { USD: 200, CNY: 1388 },
    fulfillment: { type: "credits", params: { credits: 250_000 } },
    highlight: "50,000 bonus",
  },
];

let catalog: readonly Offer[] = DEFAULT_OFFERS;

/** Replace the whole catalog. Ids must be unique and prices positive. */
export function configureOffers(offers: readonly Offer[]): void {
  const seen = new Set<string>();
  for (const offer of offers) {
    if (seen.has(offer.id)) {
      throw new BillingError(`Duplicate offer id: ${offer.id}`, "OFFER_DUPLICATE_ID", 500);
    }
    seen.add(offer.id);
    for (const [currency, price] of Object.entries(offer.prices)) {
      if (!(typeof price === "number" && price > 0)) {
        throw new BillingError(
          `Offer ${offer.id} has an invalid ${currency} price`,
          "OFFER_INVALID_PRICE",
          500,
        );
      }
    }
  }
  catalog = offers;
}

export function listOffers(): Offer[] {
  return catalog.filter((offer) => offer.active !== false);
}

export function getOffer(id: string): Offer | undefined {
  return listOffers().find((offer) => offer.id === id);
}

/** Both catalog currencies have two decimal places. */
export function toMinorUnits(major: number): number {
  return Math.round(major * 100);
}

export function toMajorString(minor: number): string {
  return (minor / 100).toFixed(2);
}
