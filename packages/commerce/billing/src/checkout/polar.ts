import type { CheckoutProvider, CreditPurchaseInput, CreditPurchaseSession } from "./types";

/**
 * PolarCheckoutProvider — wraps `createPolarCheckout`.
 *
 * Polar requires a pre-existing product id; it doesn't support fully dynamic
 * line items the way Stripe does. The caller supplies the product id via
 * `input.priceId`.
 */
export class PolarCheckoutProvider implements CheckoutProvider {
  readonly name = "polar" as const;

  async createCreditPurchase(input: CreditPurchaseInput): Promise<CreditPurchaseSession> {
    if (!input.priceId) {
      throw new Error(
        "Polar checkout requires a productId passed as `priceId` on CreditPurchaseInput",
      );
    }

    const { createPolarCheckout } = await import("../polar/index.js");

    const metadata: Record<string, string> = {
      type: "credit_purchase",
      organizationId: input.organizationId,
      creditAmount: String(input.creditAmount),
      ...(input.referenceId ? { referenceId: input.referenceId } : {}),
      ...(input.metadata ?? {}),
    };

    const checkout = await createPolarCheckout({
      productId: input.priceId,
      successUrl: input.successUrl,
      customerEmail: input.customerEmail,
      metadata,
    });

    // Polar SDK shape: { id, url, expiresAt, ... }
    const url = (checkout as { url?: string }).url;
    const id = (checkout as { id?: string }).id;
    const expiresAt = (checkout as { expiresAt?: string | Date }).expiresAt;

    if (!url) {
      throw new Error("Polar did not return a checkout URL");
    }

    return {
      url,
      sessionId: id ?? `polar_${Date.now()}`,
      provider: "polar",
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
    };
  }
}
