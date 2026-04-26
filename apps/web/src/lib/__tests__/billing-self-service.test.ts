import { describe, expect, it } from "vitest";
import {
  buildBillingSelfServiceModel,
  getPlanPriceId,
} from "@/components/billing/billing-self-service";

describe("buildBillingSelfServiceModel", () => {
  it("keeps billing self-service read-only when the feature flag is disabled", () => {
    const model = buildBillingSelfServiceModel({
      currentPlan: "FREE",
      env: {},
    });

    expect(model.provider.status).toBe("disabled");
    expect(model.portal.enabled).toBe(false);
    expect(model.plans.map((plan) => [plan.id, plan.action.enabled])).toEqual([
      ["free", false],
      ["pro_monthly", false],
      ["pro_yearly", false],
      ["enterprise", true],
    ]);
  });

  it("does not enable paid checkout when Stripe is configured without price ids", () => {
    const model = buildBillingSelfServiceModel({
      currentPlan: "FREE",
      env: {
        FEATURE_FLAG_BILLING: "true",
        BILLING_PROVIDER: "stripe",
        STRIPE_SECRET_KEY: "sk_test_123",
      },
    });

    expect(model.provider.status).toBe("degraded");
    expect(model.portal.enabled).toBe(true);
    expect(model.plans.find((plan) => plan.id === "pro_monthly")?.action).toMatchObject({
      enabled: false,
      reason: "Missing checkout price id.",
    });
  });

  it("enables checkout only for paid plans with matching configured price ids", () => {
    const model = buildBillingSelfServiceModel({
      currentPlan: "FREE",
      env: {
        FEATURE_FLAG_BILLING: "true",
        BILLING_PROVIDER: "stripe",
        STRIPE_SECRET_KEY: "sk_test_123",
        STRIPE_PRICE_ID_PRO_MONTHLY: "price_pro_monthly",
      },
    });

    expect(getPlanPriceId("pro_monthly", model.env)).toBe("price_pro_monthly");
    expect(model.plans.find((plan) => plan.id === "pro_monthly")?.action).toMatchObject({
      enabled: true,
      priceId: "price_pro_monthly",
    });
    expect(model.plans.find((plan) => plan.id === "pro_yearly")?.action.enabled).toBe(false);
  });
});
