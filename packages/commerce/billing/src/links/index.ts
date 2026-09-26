// =============================================================================
// Links into checkout — the one payment page (ADR 2026-09-27 product wallets)
// =============================================================================
// Pure and browser-safe: a product's pricing page, balance chip or "not enough
// credits" prompt builds the link here, so the query contract of /checkout is
// written once. The page itself lives in the dashboard app.
// =============================================================================

export interface CheckoutLinkInput {
  /** Where checkout lives, e.g. `https://app.example.com/checkout`. */
  checkoutUrl: string;
  offerId: string;
  /** Where to send the buyer once paid. Checkout honours first-party pages only. */
  returnTo: string;
  /** A suggested amount for an offer whose buyer names it, in `currency`. */
  amount?: number;
  currency?: "USD" | "CNY";
}

export function checkoutLink(input: CheckoutLinkInput): string {
  const url = new URL(input.checkoutUrl);
  url.searchParams.set("offer", input.offerId);
  if (input.amount !== undefined && input.currency) {
    url.searchParams.set("amount", String(input.amount));
    url.searchParams.set("currency", input.currency);
  }
  url.searchParams.set("returnTo", input.returnTo);
  return url.toString();
}
