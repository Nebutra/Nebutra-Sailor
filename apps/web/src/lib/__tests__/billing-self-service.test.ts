import { describe, expect, it } from "vitest";
import {
  type BillingReadinessView,
  buildBillingSelfServiceModel,
  getPlanPriceId,
} from "@/components/billing/billing-self-service";

const STRIPE_READY: BillingReadinessView = {
  provider: "stripe",
  status: "ready",
  title: "Stripe self-service is ready",
  description: "ready",
  checkoutReady: true,
  portalReady: true,
};

describe("buildBillingSelfServiceModel", () => {
  it("keeps billing self-service read-only until the server reports readiness", () => {
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

  it("never detects a provider from env: a Stripe secret alone opens nothing", () => {
    const model = buildBillingSelfServiceModel({
      currentPlan: "FREE",
      env: { STRIPE_SECRET_KEY: "sk_test_123", STRIPE_PRICE_ID_PRO_MONTHLY: "price_pro_monthly" },
    });

    expect(model.provider.name).toBe("manual");
    expect(model.portal.enabled).toBe(false);
    expect(model.plans.find((plan) => plan.id === "pro_monthly")?.action.enabled).toBe(false);
  });

  it("shows the server's Creem readiness without opening the legacy subscription form", () => {
    const model = buildBillingSelfServiceModel({
      currentPlan: "FREE",
      readiness: {
        provider: "creem",
        status: "ready",
        title: "Checkout is live",
        description: "Plans and credit packs can be bought here by card (Creem).",
      },
    });

    expect(model.provider).toMatchObject({ name: "creem", status: "ready" });
    expect(model.portal.enabled).toBe(false);
    expect(model.plans.find((plan) => plan.id === "pro_monthly")?.action.enabled).toBe(false);
  });

  it("does not enable paid checkout when Stripe is ready but price ids are missing", () => {
    const model = buildBillingSelfServiceModel({
      currentPlan: "FREE",
      env: {},
      readiness: STRIPE_READY,
    });

    expect(model.portal.enabled).toBe(true);
    expect(model.plans.find((plan) => plan.id === "pro_monthly")?.action).toMatchObject({
      enabled: false,
      reason: "Missing checkout price id.",
    });
  });

  it("enables legacy Stripe checkout only for paid plans with matching configured price ids", () => {
    const model = buildBillingSelfServiceModel({
      currentPlan: "FREE",
      env: { STRIPE_PRICE_ID_PRO_MONTHLY: "price_pro_monthly" },
      readiness: STRIPE_READY,
    });

    expect(getPlanPriceId("pro_monthly", model.env)).toBe("price_pro_monthly");
    expect(model.plans.find((plan) => plan.id === "pro_monthly")?.action).toMatchObject({
      enabled: true,
      priceId: "price_pro_monthly",
    });
    expect(model.plans.find((plan) => plan.id === "pro_yearly")?.action.enabled).toBe(false);
  });

  it("marks the server's current plan as active", () => {
    const model = buildBillingSelfServiceModel({ currentPlan: "pro" });
    expect(model.activePlan.id).toBe("pro_monthly");
  });
});
