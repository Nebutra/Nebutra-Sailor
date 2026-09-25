import type { CheckoutProvider, PaymentSession, PaymentSessionInput } from "./types";
import { PAYMENT_ORDER_METADATA_KEY } from "./types";

/**
 * StripeCheckoutProvider — opens a Stripe Checkout session for one payment
 * order. The price is inline `price_data` because it comes from the order,
 * which took it from the offer catalog; no Stripe Price object is involved.
 */
export class StripeCheckoutProvider implements CheckoutProvider {
  readonly name = "stripe" as const;

  async createPaymentSession(input: PaymentSessionInput): Promise<PaymentSession> {
    const { getStripe } = await import("../stripe/index");
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: input.orderId,
        ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
        line_items: [
          {
            price_data: {
              currency: input.currency.toLowerCase(),
              product_data: { name: input.title },
              unit_amount: input.amountMinor,
            },
            quantity: 1,
          },
        ],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          [PAYMENT_ORDER_METADATA_KEY]: input.orderId,
          organizationId: input.organizationId,
        },
      },
      // One order opens at most one session, however often the request is retried.
      { idempotencyKey: `payment-order:${input.orderId}` },
    );

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return {
      kind: "redirect",
      url: session.url,
      providerRef: session.id,
      provider: "stripe",
      ...(session.expires_at ? { expiresAt: new Date(session.expires_at * 1000) } : {}),
    };
  }
}

/**
 * Refund part or all of what a Checkout session collected. `refundId` is the
 * idempotency key, so a retried refund never pays out twice.
 */
export async function refundStripeCheckoutSession(input: {
  sessionId: string;
  amountMinor: number;
  refundId: string;
}): Promise<{ status: "succeeded" | "processing" | "failed" }> {
  const { getStripe } = await import("../stripe/index");
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.retrieve(input.sessionId);
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntent) {
    throw new Error(`Stripe session ${input.sessionId} has no payment to refund`);
  }

  const refund = await stripe.refunds.create(
    { payment_intent: paymentIntent, amount: input.amountMinor },
    { idempotencyKey: `refund:${input.refundId}` },
  );

  return {
    status:
      refund.status === "succeeded"
        ? "succeeded"
        : refund.status === "pending" || refund.status === "requires_action"
          ? "processing"
          : "failed",
  };
}
