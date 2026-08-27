import { describe, expect, it } from "vitest";
import { BillingError } from "../types";
import {
  assertProductReturnUrl,
  parseCheckoutSelection,
  resolveCheckoutOffer,
  resolveCheckoutReturnUrls,
} from "./checkout-plan";

describe("checkout plan catalog", () => {
  it("rejects client-supplied price ids by requiring plan + interval", () => {
    expect(() => parseCheckoutSelection({ plan: "price_abc", interval: "monthly" })).toThrow(
      BillingError,
    );
  });

  it("resolves the server catalog price and forces quantity 1", () => {
    const selection = parseCheckoutSelection({ plan: "plan_pro", interval: "year" });
    expect(
      resolveCheckoutOffer(selection, {
        STRIPE_PRICE_ID_PRO_YEARLY: "price_pro_yearly",
        STRIPE_TRIAL_DAYS_PRO: "14",
      }),
    ).toEqual({
      plan: "pro",
      interval: "yearly",
      priceId: "price_pro_yearly",
      quantity: 1,
      trialPeriodDays: 14,
    });
  });

  it("builds checkout return URLs from the product origin", () => {
    expect(resolveCheckoutReturnUrls({ APP_URL: "https://app.nebutra.com/workspace" })).toEqual({
      successUrl: "https://app.nebutra.com/checkout-return?billing=checkout-success",
      cancelUrl: "https://app.nebutra.com/checkout-return?billing=checkout-canceled",
    });
  });

  it("rejects cross-origin portal return URLs", () => {
    expect(() =>
      assertProductReturnUrl("https://evil.example/billing", {
        APP_URL: "https://app.nebutra.com",
      }),
    ).toThrow(/product origin/);
  });
});
