import type { CheckoutProvider, PaymentSession, PaymentSessionInput } from "./types";
import { PAYMENT_ORDER_METADATA_KEY } from "./types";

/**
 * CreemCheckoutProvider — card payments worldwide through Creem, the merchant
 * of record (ADR 2026-09-26). The order id travels as `request_id` and in
 * metadata; the price is the order's, passed as `custom_price` on the one
 * configured product. Creem adds tax on top and remits it.
 */
export class CreemCheckoutProvider implements CheckoutProvider {
  readonly name = "creem" as const;

  async createPaymentSession(input: PaymentSessionInput): Promise<PaymentSession> {
    const { createCreemCheckout } = await import("../creem/index");
    const checkout = await createCreemCheckout({
      requestId: input.orderId,
      customPriceMinor: input.amountMinor,
      successUrl: input.successUrl,
      ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
      metadata: {
        [PAYMENT_ORDER_METADATA_KEY]: input.orderId,
        organizationId: input.organizationId,
      },
    });
    return {
      kind: "redirect",
      url: checkout.checkout_url,
      providerRef: checkout.id,
      provider: "creem",
    };
  }
}
