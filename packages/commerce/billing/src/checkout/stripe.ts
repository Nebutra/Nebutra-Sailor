import type { CheckoutProvider, CreditPurchaseInput, CreditPurchaseSession } from "./types";

/**
 * StripeCheckoutProvider — bridges the generic checkout API to Stripe Checkout.
 *
 * Credit packs are typically variable-priced, so this provider uses dynamic
 * `price_data` line_items rather than requiring a pre-created Stripe Price.
 * If `customerId` is missing but `customerEmail` is present, it auto-creates
 * (or looks up) a customer via `getOrCreateCustomer`.
 */
export class StripeCheckoutProvider implements CheckoutProvider {
  readonly name = "stripe" as const;

  async createCreditPurchase(input: CreditPurchaseInput): Promise<CreditPurchaseSession> {
    const { getStripe, getOrCreateCustomer } = await import("../stripe/index.js");
    const stripe = getStripe();

    // Resolve customer — prefer explicit customerId, else lookup/create by email.
    let customerId = input.customerId;
    if (!customerId && input.customerEmail) {
      const customer = await getOrCreateCustomer(
        input.organizationId,
        input.customerEmail,
        input.customerEmail,
      );
      customerId = customer.id;
    }

    const metadata: Record<string, string> = {
      type: "credit_purchase",
      organizationId: input.organizationId,
      creditAmount: String(input.creditAmount),
      ...(input.referenceId ? { referenceId: input.referenceId } : {}),
      ...(input.metadata ?? {}),
    };

    const session = await stripe.checkout.sessions.create({
      ...(customerId ? { customer: customerId } : {}),
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: input.currency.toLowerCase(),
            product_data: { name: `${input.creditAmount} Credits` },
            unit_amount: Math.round(input.amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return {
      url: session.url,
      sessionId: session.id,
      provider: "stripe",
      ...(session.expires_at ? { expiresAt: new Date(session.expires_at * 1000) } : {}),
    };
  }
}
