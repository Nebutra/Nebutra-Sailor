import { describe, expect, it } from "vitest";
import { ManualCheckoutProvider } from "../manual";
import type { CreditPurchaseInput } from "../types";

const baseInput: CreditPurchaseInput = {
  organizationId: "org_123",
  creditAmount: 500,
  amount: 4.99,
  currency: "USD",
  successUrl: "https://app.example.com/success",
  cancelUrl: "https://app.example.com/cancel",
};

describe("ManualCheckoutProvider", () => {
  it("has name 'manual'", () => {
    const provider = new ManualCheckoutProvider();
    expect(provider.name).toBe("manual");
  });

  it("createCreditPurchase returns a session with all required fields", async () => {
    const provider = new ManualCheckoutProvider();
    const session = await provider.createCreditPurchase(baseInput);

    expect(session.url).toBeTruthy();
    expect(session.sessionId).toBeTruthy();
    expect(session.provider).toBe("manual");
  });

  it("session URL includes the manual_session query param", async () => {
    const provider = new ManualCheckoutProvider();
    const session = await provider.createCreditPurchase(baseInput);

    expect(session.url).toContain("manual_session=");
    expect(session.url.startsWith(baseInput.successUrl)).toBe(true);
  });

  it("session ID has 'manual_' prefix", async () => {
    const provider = new ManualCheckoutProvider();
    const session = await provider.createCreditPurchase(baseInput);

    expect(session.sessionId.startsWith("manual_")).toBe(true);
  });

  it("generates unique session IDs for each call", async () => {
    const provider = new ManualCheckoutProvider();
    const s1 = await provider.createCreditPurchase(baseInput);
    const s2 = await provider.createCreditPurchase(baseInput);

    expect(s1.sessionId).not.toBe(s2.sessionId);
  });
});
