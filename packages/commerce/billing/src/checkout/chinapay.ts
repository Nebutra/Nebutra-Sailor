import type { CheckoutProvider, CreditPurchaseInput, CreditPurchaseSession } from "./types";

/**
 * ChinaPayCheckoutProvider — wraps `createChinaPayOrder`.
 *
 * The Chinese payment aggregator flow expects a trade order id and a total_fee
 * string (in CNY yuan, not cents). We synthesize a trade order id from the
 * referenceId or creditAmount + timestamp. The payment method defaults to
 * Alipay; configure via `CHINAPAY_METHOD` env var for WeChat Pay.
 */
export class ChinaPayCheckoutProvider implements CheckoutProvider {
  readonly name = "chinapay" as const;

  async createCreditPurchase(input: CreditPurchaseInput): Promise<CreditPurchaseSession> {
    const { createChinaPayOrder } = await import("../chinapay/index.js");

    const method: "alipay" | "wechat" =
      process.env.CHINAPAY_METHOD === "wechat" ? "wechat" : "alipay";

    const tradeOrderId =
      input.referenceId ?? `credit_${input.creditAmount}_${input.organizationId}_${Date.now()}`;

    const order = await createChinaPayOrder({
      tradeOrderId,
      totalFee: input.amount.toFixed(2),
      method,
      title: `${input.creditAmount} Credits`,
      returnUrl: input.successUrl,
    });

    return {
      url: order.payUrl,
      sessionId: order.orderId || order.tradeOrderId,
      provider: "chinapay",
    };
  }
}
