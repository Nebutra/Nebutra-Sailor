import { BillingError } from "../types";

// =============================================================================
// Offers — what can be bought, and for how much
// =============================================================================
// An offer is data, not code: an id, the product it belongs to, a price per
// currency, and a fulfillment spec naming what the buyer receives once paid.
// The payment path never knows whether it is selling credits, a plan or a
// licence — it resolves an offer, charges its price, and hands the spec to the
// fulfillment registry.
//
// Every offer belongs to one product, and what it grants lands in that
// product's balance only (ADR 2026-09-27 product wallets).
//
// A price is either fixed (`prices`) or named by the buyer within a range
// (`customAmount`), the way an API balance is topped up. The server still
// prices and locks every order; the request only proposes an amount.
//
// The host replaces the catalog with `configureOffers()` at boot. The default
// below is the template's starting point, not a business decision.
// =============================================================================

export type OfferCurrency = "USD" | "CNY";

const CURRENCIES: readonly OfferCurrency[] = ["USD", "CNY"];

export interface FulfillmentSpec {
  /** Key into the fulfillment registry, e.g. "credits". */
  type: string;
  params: Record<string, unknown>;
}

/** The spec as an order locks it: the offer's product travels with it. */
export interface LockedFulfillmentSpec extends FulfillmentSpec {
  product: string;
}

export interface AmountRange {
  /** Major units, inclusive. */
  min: number;
  max: number;
}

/**
 * Whose account an offer is bought for — which tenant's balance it feeds.
 *
 * - `personal`: the buyer's own account. Consumer products (Kuanlan, like 剪映).
 * - `organization`: the active organization; buying needs billing rights there.
 * - `workspace`: the active organization when there is one, else the buyer's
 *   own account. Router's rule: an API key belongs to whichever is active.
 */
export type OfferAccount = "personal" | "organization" | "workspace";

const ACCOUNTS: readonly OfferAccount[] = ["personal", "organization", "workspace"];

export interface Offer {
  id: string;
  /** The product whose balance this offer feeds, e.g. "router". */
  product: string;
  /** Whose account it is bought for. Defaults to `organization`. */
  account?: OfferAccount;
  name: string;
  /** Fixed price, major units per currency. A currency left out cannot buy this offer. */
  prices?: Partial<Record<OfferCurrency, number>>;
  /** The buyer names the amount within a range per currency. Exclusive with `prices`. */
  customAmount?: Partial<Record<OfferCurrency, AmountRange>>;
  fulfillment: FulfillmentSpec;
  /** Display only: shown as a badge, never read by the payment path. */
  highlight?: string;
  active?: boolean;
}

export const DEFAULT_OFFERS: readonly Offer[] = [
  {
    id: "credits_10k",
    product: "app",
    name: "10,000 credits",
    prices: { USD: 10, CNY: 68 },
    fulfillment: { type: "credits", params: { credits: 10_000 } },
  },
  {
    id: "credits_55k",
    product: "app",
    name: "55,000 credits",
    prices: { USD: 50, CNY: 348 },
    fulfillment: { type: "credits", params: { credits: 55_000 } },
    highlight: "5,000 bonus",
  },
  {
    id: "credits_250k",
    product: "app",
    name: "250,000 credits",
    prices: { USD: 200, CNY: 1388 },
    fulfillment: { type: "credits", params: { credits: 250_000 } },
    highlight: "50,000 bonus",
  },
];

let catalog: readonly Offer[] = DEFAULT_OFFERS;

const PRODUCT_ID = /^[a-z][a-z0-9-]{1,31}$/;

function invalid(offer: Offer, what: string): never {
  throw new BillingError(`Offer ${offer.id} ${what}`, "OFFER_INVALID", 500);
}

function validate(offer: Offer): void {
  if (!PRODUCT_ID.test(offer.product ?? "")) invalid(offer, "needs a product id");
  if (offer.account !== undefined && !ACCOUNTS.includes(offer.account)) {
    invalid(offer, `has an unknown account "${offer.account}"`);
  }
  const fixed = offer.prices ? Object.entries(offer.prices) : [];
  const custom = offer.customAmount ? Object.entries(offer.customAmount) : [];
  if (fixed.length > 0 === custom.length > 0) {
    invalid(offer, "needs exactly one of prices or customAmount");
  }
  for (const [currency, price] of fixed) {
    if (!(typeof price === "number" && price > 0))
      invalid(offer, `has an invalid ${currency} price`);
  }
  for (const [currency, range] of custom) {
    if (!(range && range.min > 0 && range.max >= range.min)) {
      invalid(offer, `has an invalid ${currency} amount range`);
    }
  }
}

/** Replace the whole catalog. Ids must be unique, prices positive, each offer owned by a product. */
export function configureOffers(offers: readonly Offer[]): void {
  const seen = new Set<string>();
  for (const offer of offers) {
    if (seen.has(offer.id)) {
      throw new BillingError(`Duplicate offer id: ${offer.id}`, "OFFER_DUPLICATE_ID", 500);
    }
    seen.add(offer.id);
    validate(offer);
  }
  catalog = offers;
}

/**
 * Load the catalog from `BILLING_OFFERS_JSON` when the deployment sets it: a
 * JSON array of offers, validated like `configureOffers`. Unset keeps the
 * template default. A malformed catalog throws, so a bad price list stops the
 * boot instead of selling at a wrong price.
 */
export function configureOffersFromEnv(
  env: Record<string, string | undefined> = process.env,
): void {
  const raw = env.BILLING_OFFERS_JSON?.trim();
  if (!raw) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BillingError("BILLING_OFFERS_JSON is not valid JSON", "OFFER_CATALOG_INVALID", 500);
  }
  if (!Array.isArray(parsed)) {
    throw new BillingError(
      "BILLING_OFFERS_JSON must be an array of offers",
      "OFFER_CATALOG_INVALID",
      500,
    );
  }
  configureOffers(parsed as Offer[]);
}

export function listOffers(product?: string): Offer[] {
  return catalog.filter(
    (offer) => offer.active !== false && (product === undefined || offer.product === product),
  );
}

export function getOffer(id: string): Offer | undefined {
  return listOffers().find((offer) => offer.id === id);
}

export function offerAccount(offer: Offer): OfferAccount {
  return offer.account ?? "organization";
}

export function offerCurrencies(offer: Offer): OfferCurrency[] {
  return CURRENCIES.filter((c) =>
    offer.prices ? offer.prices[c] !== undefined : offer.customAmount?.[c] !== undefined,
  );
}

/**
 * The price, in major units, an order for this offer is locked at. A fixed
 * offer ignores `requested`; a custom-amount offer takes it and refuses
 * anything outside its range.
 */
export function priceOffer(offer: Offer, currency: OfferCurrency, requested?: number): number {
  if (offer.prices) {
    const price = offer.prices[currency];
    if (price === undefined) {
      throw new BillingError(
        `Offer ${offer.id} has no ${currency} price`,
        "OFFER_CURRENCY_UNAVAILABLE",
        400,
      );
    }
    return price;
  }
  const range = offer.customAmount?.[currency];
  if (!range) {
    throw new BillingError(
      `Offer ${offer.id} cannot be bought in ${currency}`,
      "OFFER_CURRENCY_UNAVAILABLE",
      400,
    );
  }
  // Two decimal places at most, so the amount becomes minor units exactly.
  if (
    typeof requested !== "number" ||
    !Number.isFinite(requested) ||
    Math.abs(Math.round(requested * 100) - requested * 100) > 1e-6 ||
    requested < range.min ||
    requested > range.max
  ) {
    throw new BillingError(
      `Offer ${offer.id} takes an amount between ${range.min} and ${range.max} ${currency}`,
      "OFFER_AMOUNT_OUT_OF_RANGE",
      400,
    );
  }
  return requested;
}

/** Both catalog currencies have two decimal places. */
export function toMinorUnits(major: number): number {
  return Math.round(major * 100);
}

export function toMajorString(minor: number): string {
  return (minor / 100).toFixed(2);
}
