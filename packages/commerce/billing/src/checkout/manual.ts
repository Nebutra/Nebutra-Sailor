import type { CheckoutProvider, CreditPurchaseInput, CreditPurchaseSession } from "./types";

/**
 * ManualCheckoutProvider — no payment is taken.
 *
 * Useful for dev/test flows and admin-driven credit grants where the real
 * payment happens out-of-band (wire transfer, invoice, manual Stripe dashboard
 * charge, etc.). The returned URL redirects straight to the successUrl with a
 * synthetic session id so the UI can track the handoff.
 */
export class ManualCheckoutProvider implements CheckoutProvider {
  readonly name = "manual" as const;

  async createCreditPurchase(input: CreditPurchaseInput): Promise<CreditPurchaseSession> {
    const sessionId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const separator = input.successUrl.includes("?") ? "&" : "?";
    return {
      url: `${input.successUrl}${separator}manual_session=${sessionId}`,
      sessionId,
      provider: "manual",
    };
  }
}
