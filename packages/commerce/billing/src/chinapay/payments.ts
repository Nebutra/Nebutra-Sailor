import {
  buildAlipayWapPayUrl,
  createAlipayPrecreateOrder,
  queryAlipayOrder,
  refundAlipayOrder,
} from "./alipay";
import {
  createWechatH5Order,
  createWechatNativeOrder,
  queryWechatOrder,
  refundWechatOrder,
} from "./wechat";

export type ChinaPayMethod = "alipay" | "wechat";

/** `qr` for a desktop buyer to scan; `h5` to open the wallet on the buyer's own phone. */
export type ChinaPayChannel = "qr" | "h5";

export interface CreateChinaPayOrderInput {
  /** Unique order ID from your system. */
  tradeOrderId: string;
  /** Amount in CNY (yuan), e.g., "9.90". */
  totalFee: string;
  /** Payment method. */
  method: ChinaPayMethod;
  channel?: ChinaPayChannel;
  /** Order title/description. */
  title: string;
  /** Opaque metadata carried through to the payment notification. */
  attach?: string;
  /** H5 only: where the browser returns after paying. */
  returnUrl?: string;
  /** H5 only: where the browser goes if the buyer abandons (Alipay). */
  quitUrl?: string;
  /** H5 only: the buyer's IP — WeChat Pay H5 requires it. */
  clientIp?: string;
}

export interface ChinaPayOrder {
  /** `qr`: render `payUrl` as a QR code. `redirect`: send the browser to it. */
  kind: "qr" | "redirect";
  payUrl: string;
  tradeOrderId: string;
}

function yuanToFen(yuan: string): number {
  return Math.round(Number.parseFloat(yuan) * 100);
}

/**
 * Create a payment order directly with the official gateway — no aggregator
 * in the path. Desktop: WeChat Native / Alipay `trade.precreate`, both a QR.
 * Phone: WeChat H5 / Alipay `trade.wap.pay`, both a redirect into the wallet.
 */
export async function createChinaPayOrder(input: CreateChinaPayOrderInput): Promise<ChinaPayOrder> {
  const channel = input.channel ?? "qr";

  if (input.method === "wechat") {
    const order = {
      outTradeNo: input.tradeOrderId,
      description: input.title,
      totalFen: yuanToFen(input.totalFee),
      attach: input.attach,
    };

    if (channel === "h5") {
      if (!input.clientIp) {
        throw new Error("WeChat Pay H5 needs the buyer's IP (clientIp)");
      }
      const { h5Url } = await createWechatH5Order({
        ...order,
        clientIp: input.clientIp,
        redirectUrl: input.returnUrl,
      });
      return { kind: "redirect", payUrl: h5Url, tradeOrderId: input.tradeOrderId };
    }

    const { codeUrl } = await createWechatNativeOrder(order);
    return { kind: "qr", payUrl: codeUrl, tradeOrderId: input.tradeOrderId };
  }

  const order = {
    outTradeNo: input.tradeOrderId,
    subject: input.title,
    totalAmount: input.totalFee,
    passbackParams: input.attach,
  };

  if (channel === "h5") {
    const { payUrl } = buildAlipayWapPayUrl({
      ...order,
      returnUrl: input.returnUrl,
      quitUrl: input.quitUrl,
    });
    return { kind: "redirect", payUrl, tradeOrderId: input.tradeOrderId };
  }

  const { qrCode } = await createAlipayPrecreateOrder(order);
  return { kind: "qr", payUrl: qrCode, tradeOrderId: input.tradeOrderId };
}

/** Poll order status from the gateway (reconciliation / admin use). */
export async function queryChinaPayOrder(
  tradeOrderId: string,
  method: ChinaPayMethod,
): Promise<{ status: "paid" | "pending" | "failed"; paidFen: number; providerRef?: string }> {
  if (method === "wechat") {
    const result = await queryWechatOrder(tradeOrderId);
    return { status: result.status, paidFen: result.amountFen, providerRef: result.transactionId };
  }
  const result = await queryAlipayOrder(tradeOrderId);
  return {
    status: result.status,
    paidFen: yuanToFen(result.totalAmount),
    providerRef: result.tradeNo,
  };
}

export interface RefundChinaPayOrderInput {
  tradeOrderId: string;
  /** Idempotency key: the same refundId never pays out twice. */
  refundId: string;
  method: ChinaPayMethod;
  /** CNY yuan to refund, e.g. "9.90". */
  refundFee: string;
  /** CNY yuan originally paid — WeChat Pay requires it. */
  totalFee: string;
  reason?: string;
}

/**
 * Refund all or part of a paid order. This moves money only; reversing the
 * credits the purchase granted is the caller's decision.
 */
export async function refundChinaPayOrder(
  input: RefundChinaPayOrderInput,
): Promise<{ status: "succeeded" | "processing" | "failed" }> {
  if (input.method === "wechat") {
    const { status } = await refundWechatOrder({
      outTradeNo: input.tradeOrderId,
      outRefundNo: input.refundId,
      refundFen: yuanToFen(input.refundFee),
      totalFen: yuanToFen(input.totalFee),
      reason: input.reason,
    });
    return { status };
  }

  return refundAlipayOrder({
    outTradeNo: input.tradeOrderId,
    outRequestNo: input.refundId,
    refundAmount: input.refundFee,
    reason: input.reason,
  });
}
