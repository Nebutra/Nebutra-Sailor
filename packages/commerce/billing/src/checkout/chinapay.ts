import { isChinaPayConfigured } from "./factory";
import type { CheckoutProvider, PaymentSession, PaymentSessionInput } from "./types";

/**
 * ChinaPayCheckoutProvider — official WeChat Pay APIv3 or Alipay, no
 * aggregator. The order id is the merchant order number (out_trade_no), so a
 * notification or a status query finds the order with no metadata at all.
 * `kind` says what to do with the url: render a QR code on a desktop, or
 * redirect into the wallet on a phone (see chinapay/payments.ts).
 */
export class ChinaPayCheckoutProvider implements CheckoutProvider {
  readonly name = "chinapay" as const;

  async createPaymentSession(input: PaymentSessionInput): Promise<PaymentSession> {
    const { createChinaPayOrder } = await import("../chinapay/index");

    // The buyer picks the wallet; with no choice, use whichever is configured.
    const method: "alipay" | "wechat" =
      input.method ?? (isChinaPayConfigured("alipay") ? "alipay" : "wechat");

    const order = await createChinaPayOrder({
      tradeOrderId: input.orderId,
      totalFee: (input.amountMinor / 100).toFixed(2),
      method,
      title: input.title,
      channel: input.channel,
      clientIp: input.clientIp,
      returnUrl: input.successUrl,
      quitUrl: input.cancelUrl,
    });

    return { kind: order.kind, url: order.payUrl, provider: "chinapay" };
  }
}
