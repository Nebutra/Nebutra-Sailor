import { logger } from "@nebutra/logger";
import type { CheckoutProvider, CreditPurchaseInput, CreditPurchaseSession } from "./types";
import { CREDIT_PURCHASE_METADATA_TYPE } from "./types";

const log = logger.child({ service: "chinapay-checkout" });

/**
 * ChinaPayCheckoutProvider — official WeChat Pay APIv3 or Alipay, no
 * aggregator. Returns a `payUrl` meant to be rendered as a QR code on the
 * checkout page (see chinapay/payments.ts).
 */
export class ChinaPayCheckoutProvider implements CheckoutProvider {
  readonly name = "chinapay" as const;

  async createCreditPurchase(input: CreditPurchaseInput): Promise<CreditPurchaseSession> {
    const { createChinaPayOrder } = await import("../chinapay/index");

    const method: "alipay" | "wechat" =
      process.env.CHINAPAY_METHOD === "wechat" ? "wechat" : "alipay";

    const tradeOrderId =
      input.referenceId ?? `credit_${input.creditAmount}_${input.organizationId}_${Date.now()}`;

    // WeChat Pay's `attach` is capped at 128 bytes; keep this compact and
    // drop the reference id first if the organization id alone is unusually
    // long, since organizationId and creditAmount are what the webhook needs
    // to credit the right ledger (see checkout/credit-webhook.ts).
    const attachPayload = (includeReference: boolean) =>
      JSON.stringify({
        t: CREDIT_PURCHASE_METADATA_TYPE,
        o: input.organizationId,
        c: String(input.creditAmount),
        ...(includeReference && input.referenceId ? { r: input.referenceId } : {}),
      });

    let attach = attachPayload(true);
    if (Buffer.byteLength(attach, "utf8") > 128) {
      attach = attachPayload(false);
    }
    if (Buffer.byteLength(attach, "utf8") > 128) {
      log.error("ChinaPay attach payload exceeds 128 bytes even without referenceId", {
        organizationId: input.organizationId,
      });
      throw new Error("Credit purchase metadata is too large for WeChat Pay/Alipay passthrough");
    }

    const order = await createChinaPayOrder({
      tradeOrderId,
      totalFee: input.amount.toFixed(2),
      method,
      title: `${input.creditAmount} Credits`,
      attach,
    });

    return {
      url: order.payUrl,
      sessionId: order.tradeOrderId,
      provider: "chinapay",
    };
  }
}
