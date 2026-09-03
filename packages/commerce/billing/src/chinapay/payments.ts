import { createAlipayPrecreateOrder, queryAlipayOrder } from "./alipay";
import { createWechatNativeOrder, queryWechatOrder } from "./wechat";

export type ChinaPayMethod = "alipay" | "wechat";

export interface CreateChinaPayOrderInput {
  /** Unique order ID from your system. */
  tradeOrderId: string;
  /** Amount in CNY (yuan), e.g., "9.90". */
  totalFee: string;
  /** Payment method. */
  method: ChinaPayMethod;
  /** Order title/description. */
  title: string;
  /** Opaque metadata carried through to the payment notification. */
  attach?: string;
}

export interface ChinaPayOrder {
  /** A value to render as a QR code — not an http redirect for either method. */
  payUrl: string;
  tradeOrderId: string;
}

/**
 * Create a payment order directly with the official gateway (WeChat Pay
 * APIv3 Native, or Alipay `trade.precreate`) — no aggregator in the path.
 */
export async function createChinaPayOrder(input: CreateChinaPayOrderInput): Promise<ChinaPayOrder> {
  if (input.method === "wechat") {
    const totalFen = Math.round(Number.parseFloat(input.totalFee) * 100);
    const { codeUrl } = await createWechatNativeOrder({
      outTradeNo: input.tradeOrderId,
      description: input.title,
      totalFen,
      attach: input.attach,
    });
    return { payUrl: codeUrl, tradeOrderId: input.tradeOrderId };
  }

  const { qrCode } = await createAlipayPrecreateOrder({
    outTradeNo: input.tradeOrderId,
    subject: input.title,
    totalAmount: input.totalFee,
    passbackParams: input.attach,
  });
  return { payUrl: qrCode, tradeOrderId: input.tradeOrderId };
}

/** Poll order status from the gateway (reconciliation / admin use). */
export async function queryChinaPayOrder(
  tradeOrderId: string,
  method: ChinaPayMethod,
): Promise<{ status: "paid" | "pending" | "failed" }> {
  if (method === "wechat") {
    const result = await queryWechatOrder(tradeOrderId);
    return { status: result.status };
  }
  const result = await queryAlipayOrder(tradeOrderId);
  return { status: result.status };
}
