import { describe, expect, it } from "vitest";
import { CREDIT_PURCHASE_METADATA_TYPE, CreditPurchaseInputSchema } from "../types";

describe("CreditPurchaseInputSchema", () => {
  const validInput = {
    organizationId: "org_123",
    creditAmount: 1000,
    amount: 9.99,
    successUrl: "https://app.example.com/success",
    cancelUrl: "https://app.example.com/cancel",
  };

  it("validates a minimal valid input", () => {
    const result = CreditPurchaseInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("defaults currency to USD", () => {
    const parsed = CreditPurchaseInputSchema.parse(validInput);
    expect(parsed.currency).toBe("USD");
  });

  it("accepts explicit currency override", () => {
    const parsed = CreditPurchaseInputSchema.parse({ ...validInput, currency: "EUR" });
    expect(parsed.currency).toBe("EUR");
  });

  it("rejects non-URL successUrl", () => {
    const result = CreditPurchaseInputSchema.safeParse({
      ...validInput,
      successUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-URL cancelUrl", () => {
    const result = CreditPurchaseInputSchema.safeParse({
      ...validInput,
      cancelUrl: "also-not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero creditAmount", () => {
    const result = CreditPurchaseInputSchema.safeParse({
      ...validInput,
      creditAmount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative creditAmount", () => {
    const result = CreditPurchaseInputSchema.safeParse({
      ...validInput,
      creditAmount: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer creditAmount", () => {
    const result = CreditPurchaseInputSchema.safeParse({
      ...validInput,
      creditAmount: 10.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = CreditPurchaseInputSchema.safeParse({
      ...validInput,
      amount: -1.0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = CreditPurchaseInputSchema.safeParse({
      ...validInput,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects currency codes with wrong length", () => {
    const result = CreditPurchaseInputSchema.safeParse({
      ...validInput,
      currency: "US",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty organizationId", () => {
    const result = CreditPurchaseInputSchema.safeParse({
      ...validInput,
      organizationId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid customerEmail", () => {
    const result = CreditPurchaseInputSchema.safeParse({
      ...validInput,
      customerEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional metadata", () => {
    const parsed = CreditPurchaseInputSchema.parse({
      ...validInput,
      metadata: { campaign: "spring-sale" },
    });
    expect(parsed.metadata).toEqual({ campaign: "spring-sale" });
  });
});

describe("CREDIT_PURCHASE_METADATA_TYPE", () => {
  it("is the literal string 'credit_purchase'", () => {
    expect(CREDIT_PURCHASE_METADATA_TYPE).toBe("credit_purchase");
  });
});
