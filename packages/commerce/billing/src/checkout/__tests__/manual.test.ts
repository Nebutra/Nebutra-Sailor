import { describe, expect, it } from "vitest";
import { ManualCheckoutProvider } from "../manual";
import type { PaymentSessionInput } from "../types";

const baseInput: PaymentSessionInput = {
  orderId: "order_1",
  organizationId: "org_123",
  title: "500 credits",
  amountMinor: 499,
  currency: "USD",
  successUrl: "https://app.example.com/success",
  cancelUrl: "https://app.example.com/cancel",
};

describe("ManualCheckoutProvider", () => {
  it("has name 'manual'", () => {
    expect(new ManualCheckoutProvider().name).toBe("manual");
  });

  it("redirects to the success URL carrying the order id", async () => {
    const session = await new ManualCheckoutProvider().createPaymentSession(baseInput);

    expect(session.kind).toBe("redirect");
    expect(session.provider).toBe("manual");
    expect(session.url).toBe("https://app.example.com/success?manual_order=order_1");
  });

  it("appends with & when the success URL already has a query", async () => {
    const session = await new ManualCheckoutProvider().createPaymentSession({
      ...baseInput,
      successUrl: "https://app.example.com/success?tab=credits",
    });

    expect(session.url).toBe("https://app.example.com/success?tab=credits&manual_order=order_1");
  });
});
