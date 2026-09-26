import { brand } from "@nebutra/brand/metadata";
import { describe, expect, it } from "vitest";
import { checkoutUrl } from "./wallet-client";

const WALLET = `https://${brand.domains.router}/wallet`;

describe("Router top-up", () => {
  it("hands the buyer to checkout with the Router offer, the amount in USD, and the way back", () => {
    const url = new URL(checkoutUrl(25, WALLET));
    expect(url.pathname).toBe("/checkout");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      offer: "router_topup",
      amount: "25",
      currency: "USD",
      returnTo: WALLET,
    });
  });
});
