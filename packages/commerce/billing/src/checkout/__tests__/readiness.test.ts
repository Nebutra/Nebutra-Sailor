import { describe, expect, it } from "vitest";
import { resolveBillingProviderReadiness } from "../readiness";

describe("resolveBillingProviderReadiness", () => {
  it("reports disabled manual billing when self-service is off", () => {
    expect(
      resolveBillingProviderReadiness({
        env: {},
        selfServiceEnabled: false,
        requiredPriceEnvVars: ["STRIPE_PRICE_ID_PRO_MONTHLY"],
      }),
    ).toMatchObject({
      provider: "manual",
      status: "disabled",
      checkoutReady: false,
      portalReady: false,
      missing: [],
    });
  });

  it("reports degraded Stripe readiness when required SaaS price ids are missing", () => {
    expect(
      resolveBillingProviderReadiness({
        env: {
          BILLING_PROVIDER: "stripe",
          STRIPE_SECRET_KEY: "sk_test_123",
          STRIPE_PRICE_ID_PRO_MONTHLY: "price_monthly",
        },
        selfServiceEnabled: true,
        requiredPriceEnvVars: ["STRIPE_PRICE_ID_PRO_MONTHLY", "STRIPE_PRICE_ID_PRO_YEARLY"],
      }),
    ).toMatchObject({
      provider: "stripe",
      status: "degraded",
      checkoutReady: false,
      portalReady: true,
      missing: ["STRIPE_PRICE_ID_PRO_YEARLY"],
    });
  });

  it("reports ready Stripe readiness when credentials and paid plan prices exist", () => {
    expect(
      resolveBillingProviderReadiness({
        env: {
          BILLING_PROVIDER: "stripe",
          STRIPE_SECRET_KEY: "sk_test_123",
          STRIPE_PRICE_ID_PRO_MONTHLY: "price_monthly",
          STRIPE_PRICE_ID_PRO_YEARLY: "price_yearly",
        },
        selfServiceEnabled: true,
        requiredPriceEnvVars: ["STRIPE_PRICE_ID_PRO_MONTHLY", "STRIPE_PRICE_ID_PRO_YEARLY"],
      }),
    ).toMatchObject({
      provider: "stripe",
      status: "ready",
      checkoutReady: true,
      portalReady: true,
      missing: [],
    });
  });
});
