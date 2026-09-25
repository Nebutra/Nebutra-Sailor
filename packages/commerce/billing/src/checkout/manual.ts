import type { CheckoutProvider, PaymentSession, PaymentSessionInput } from "./types";

/**
 * ManualCheckoutProvider — no money moves. Development and admin flows only:
 * it returns the success URL, and the order stays PENDING until someone
 * settles it by hand.
 */
export class ManualCheckoutProvider implements CheckoutProvider {
  readonly name = "manual" as const;

  async createPaymentSession(input: PaymentSessionInput): Promise<PaymentSession> {
    const separator = input.successUrl.includes("?") ? "&" : "?";
    return {
      kind: "redirect",
      url: `${input.successUrl}${separator}manual_order=${input.orderId}`,
      provider: "manual",
    };
  }
}
