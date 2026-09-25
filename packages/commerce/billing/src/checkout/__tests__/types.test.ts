import { describe, expect, it } from "vitest";
import { DEFAULT_PRICING } from "../../types";
import { CREDIT_PURCHASE_METADATA_TYPE, PaymentSessionInputSchema } from "../types";

describe("PaymentSessionInputSchema", () => {
  const validInput = {
    orderId: "cmg1abcdefghijklmnopqrstu",
    organizationId: "org_123",
    title: "10,000 credits",
    amountMinor: 6800,
    currency: "CNY",
    successUrl: "https://app.example.com/success",
    cancelUrl: "https://app.example.com/cancel",
  };

  it("validates a minimal valid input", () => {
    expect(PaymentSessionInputSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects an order id longer than WeChat Pay's 32-character out_trade_no", () => {
    const result = PaymentSessionInputSchema.safeParse({ ...validInput, orderId: "o".repeat(33) });
    expect(result.success).toBe(false);
  });

  it("rejects a fractional or non-positive amountMinor", () => {
    for (const amountMinor of [0, -100, 68.5]) {
      expect(PaymentSessionInputSchema.safeParse({ ...validInput, amountMinor }).success).toBe(
        false,
      );
    }
  });

  it("rejects non-URL return urls", () => {
    expect(
      PaymentSessionInputSchema.safeParse({ ...validInput, successUrl: "not-a-url" }).success,
    ).toBe(false);
    expect(
      PaymentSessionInputSchema.safeParse({ ...validInput, cancelUrl: "also-not-a-url" }).success,
    ).toBe(false);
  });

  it("rejects currency codes with wrong length", () => {
    expect(PaymentSessionInputSchema.safeParse({ ...validInput, currency: "US" }).success).toBe(
      false,
    );
  });

  it("accepts the wallet fields", () => {
    const parsed = PaymentSessionInputSchema.parse({
      ...validInput,
      method: "wechat",
      channel: "h5",
      clientIp: "203.0.113.7",
    });
    expect(parsed.channel).toBe("h5");
  });
});

describe("DEFAULT_PRICING SaaS metadata", () => {
  it("marks the default free plan and paid SaaS subscriptions with seat/trial metadata", () => {
    const free = DEFAULT_PRICING.find((plan) => plan.id === "free");
    const proMonthly = DEFAULT_PRICING.find((plan) => plan.id === "pro_monthly");
    const proYearly = DEFAULT_PRICING.find((plan) => plan.id === "pro_yearly");

    expect(free).toMatchObject({ isDefault: true, amount: 0, trialPeriodDays: 0 });
    expect(proMonthly).toMatchObject({ seatBased: true, trialPeriodDays: 14 });
    expect(proYearly).toMatchObject({ seatBased: true, trialPeriodDays: 14 });
  });
});

describe("CREDIT_PURCHASE_METADATA_TYPE", () => {
  it("is the literal string 'credit_purchase'", () => {
    expect(CREDIT_PURCHASE_METADATA_TYPE).toBe("credit_purchase");
  });
});
