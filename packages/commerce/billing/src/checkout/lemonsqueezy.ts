import type { CheckoutProvider, CreditPurchaseInput, CreditPurchaseSession } from "./types";

/**
 * LemonCheckoutProvider — wraps `createLemonCheckout`.
 *
 * LemonSqueezy requires a pre-existing variant id; the caller passes it via
 * `input.priceId`. Custom data is embedded so the webhook handler can identify
 * credit-purchase payments.
 */
export class LemonCheckoutProvider implements CheckoutProvider {
  readonly name = "lemonsqueezy" as const;

  async createCreditPurchase(input: CreditPurchaseInput): Promise<CreditPurchaseSession> {
    if (!input.priceId) {
      throw new Error(
        "LemonSqueezy checkout requires a variantId passed as `priceId` on CreditPurchaseInput",
      );
    }

    const { createLemonCheckout } = await import("../lemonsqueezy/index.js");

    const customData: Record<string, string> = {
      type: "credit_purchase",
      organizationId: input.organizationId,
      creditAmount: String(input.creditAmount),
      ...(input.referenceId ? { referenceId: input.referenceId } : {}),
      ...(input.metadata ?? {}),
    };

    const { checkoutUrl, checkout } = await createLemonCheckout({
      variantId: input.priceId,
      email: input.customerEmail,
      redirectUrl: input.successUrl,
      customData,
    });

    const sessionId = checkout?.data?.id ?? `lemon_${Date.now()}`;

    return {
      url: checkoutUrl,
      sessionId: String(sessionId),
      provider: "lemonsqueezy",
    };
  }
}
