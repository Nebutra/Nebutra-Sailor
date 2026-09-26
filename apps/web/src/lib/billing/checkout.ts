import { brand } from "@nebutra/brand/metadata";

/**
 * The checkout page's rules, kept pure so they can be tested without a request.
 *
 * Checkout is the one payment page every product sends its buyers to (ADR
 * 2026-09-27 product wallets): a product links here with the offer it sells and
 * where to come back to, and the buyer never sees payment code anywhere else.
 */

/** What the payment API calls an offer, as the gateway lists it. */
export interface CheckoutOffer {
  id: string;
  product: string;
  name: string;
  prices?: { USD?: number; CNY?: number };
  customAmount?: { USD?: AmountRange; CNY?: AmountRange };
  highlight?: string;
}

export interface AmountRange {
  min: number;
  max: number;
}

export type PaymentMethod = "card" | "alipay" | "wechat";
export type Currency = "USD" | "CNY";

export interface LiveMethod {
  id: PaymentMethod;
  currency: Currency;
}

/** Product names are proper names: shown as written, in every language. */
const PRODUCT_NAMES: Record<string, string> = {
  router: "Router",
  kuanlan: "观澜 Kuanlan",
  para: "Para",
  forge: "Forge",
};

export function productName(product: string): string {
  return PRODUCT_NAMES[product] ?? brand.name;
}

/** The root every first-party product lives under: the landing domain, without `www.`. */
function rootDomain(): string {
  return brand.domains.landing.replace(/^www\./, "");
}

/**
 * Where to send the buyer once the order is paid. Only a first-party product
 * may be named — an https origin on the brand's root domain — or a path on
 * this app. Anything else is dropped, so checkout cannot be turned into an
 * open redirect.
 */
export function resolveReturnTo(value: string | undefined | null): string | null {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const root = rootDomain();
  const host = url.hostname.toLowerCase();
  const firstParty = host === root || host.endsWith(`.${root}`);
  if (url.protocol !== "https:" || !firstParty || url.username || url.password) return null;
  return url.toString();
}

/** A phone pays inside the wallet app (H5); a desktop scans a QR code. */
export function walletChannel(userAgent: string | null | undefined): "qr" | "h5" {
  return /Mobi|Android|iPhone|iPad|HarmonyOS/i.test(userAgent ?? "") ? "h5" : "qr";
}

/** The currencies an offer can be bought in, in the order methods list them. */
export function offerCurrencies(offer: CheckoutOffer): Currency[] {
  const source = offer.prices ?? offer.customAmount ?? {};
  return (["USD", "CNY"] as const).filter((c) => source[c] !== undefined);
}

/** The methods that are live and can pay this offer. */
export function methodsFor(offer: CheckoutOffer, live: LiveMethod[]): LiveMethod[] {
  const currencies = new Set(offerCurrencies(offer));
  return live.filter((m) => currencies.has(m.currency));
}

/**
 * Wallets first for a Chinese-speaking buyer, the card first for everyone
 * else — the default a buyer would pick, never a restriction.
 */
export function defaultMethod(methods: LiveMethod[], locale: string): PaymentMethod | undefined {
  const order: PaymentMethod[] = locale.startsWith("zh")
    ? ["alipay", "wechat", "card"]
    : ["card", "alipay", "wechat"];
  return order.find((id) => methods.some((m) => m.id === id));
}

/**
 * Parse a buyer-named amount. Two decimal places at most, inside the offer's
 * range. The gateway checks again; this only keeps a bad number off the wire.
 */
export function parseAmount(
  raw: string,
  range: AmountRange,
): { ok: true; value: number } | { ok: false; reason: "invalid" | "range" } {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return { ok: false, reason: "invalid" };
  const value = Number(trimmed);
  if (value < range.min || value > range.max) return { ok: false, reason: "range" };
  return { ok: true, value };
}
