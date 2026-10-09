import { describe, expect, it } from "vitest";
import { formatBalance, isLow, KCQ_TOPUP_OFFER_ID, parseWallet, topUpUrl } from "./wallet";

describe("parseWallet", () => {
  it("reads a customer balance and keeps only well-formed usage rows", () => {
    expect(
      parseWallet({
        internal: false,
        balance: 4.25,
        currency: "USD",
        usage: [
          { id: "a", occurredAt: "2026-10-09T10:00:00Z", model: "m", cost: 0.01, currency: "USD" },
          { id: 7, occurredAt: "x", cost: 1 },
        ],
      }),
    ).toEqual({
      status: "ready",
      balance: 4.25,
      currency: "USD",
      usage: [
        { id: "a", occurredAt: "2026-10-09T10:00:00Z", model: "m", cost: 0.01, currency: "USD" },
      ],
    });
  });

  it("marks staff as not billed", () => {
    expect(parseWallet({ internal: true, billed: false })).toEqual({ status: "internal" });
  });

  it("never turns a malformed answer into a zero balance", () => {
    expect(parseWallet(null)).toEqual({ status: "error" });
    expect(parseWallet({ balance: "4", currency: "USD" })).toEqual({ status: "error" });
    expect(parseWallet({ balance: Number.NaN, currency: "USD" })).toEqual({ status: "error" });
  });
});

describe("topUpUrl", () => {
  it("opens the shared checkout for the KCQ offer and comes back to this app", () => {
    const url = new URL(topUpUrl("https://kcq.nebutra.com/", 25));
    expect(url.origin + url.pathname).toBe("https://app.nebutra.com/checkout");
    expect(url.searchParams.get("offer")).toBe(KCQ_TOPUP_OFFER_ID);
    expect(url.searchParams.get("amount")).toBe("25");
    expect(url.searchParams.get("currency")).toBe("USD");
    expect(url.searchParams.get("returnTo")).toBe("https://kcq.nebutra.com/");
  });

  it("leaves the amount to the buyer when none is suggested", () => {
    const url = new URL(topUpUrl("https://kcq.nebutra.com"));
    expect(url.searchParams.has("amount")).toBe(false);
  });
});

describe("balance formatting", () => {
  it("shows dollars and keeps sub-cent digits", () => {
    expect(formatBalance(4.256, "USD")).toBe("$4.26");
    expect(formatBalance(0.0002, "USD")).toBe("$0.000200");
    expect(formatBalance(0, "USD")).toBe("$0.00");
  });
  it("flags a nearly empty wallet only when a balance is known", () => {
    expect(isLow({ status: "ready", balance: 0.2, currency: "USD", usage: [] })).toBe(true);
    expect(isLow({ status: "ready", balance: 9, currency: "USD", usage: [] })).toBe(false);
    expect(isLow({ status: "error" })).toBe(false);
  });
});
