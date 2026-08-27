import { logger } from "@nebutra/logger";
import { BillingError } from "../types";
import { getChinaPayConfig, signPayload } from "./client";

export type ChinaPayMethod = "alipay" | "wechat";

export interface CreateChinaPayOrderInput {
  /** Unique order ID from your system */
  tradeOrderId: string;
  /** Amount in CNY (yuan), e.g., 9.90 */
  totalFee: string;
  /** Payment method */
  method: ChinaPayMethod;
  /** Order title/description */
  title: string;
  /** URL to redirect after payment (optional) */
  returnUrl?: string;
}

export interface ChinaPayOrder {
  /** Payment URL — redirect user here, or generate QR code from it */
  payUrl: string;
  /** Order ID from the gateway */
  orderId: string;
  /** Original trade order ID */
  tradeOrderId: string;
}

/**
 * Create a payment order via the China payment gateway.
 * Returns a payment URL that can be used as a redirect or QR code.
 */
export async function createChinaPayOrder(input: CreateChinaPayOrderInput): Promise<ChinaPayOrder> {
  const cfg = getChinaPayConfig();

  const params: Record<string, string> = {
    version: "1.1",
    appid: cfg.appId,
    trade_order_id: input.tradeOrderId,
    total_fee: input.totalFee,
    title: input.title,
    time: String(Math.floor(Date.now() / 1000)),
    notify_url: cfg.notifyUrl,
    nonce_str: Math.random().toString(36).slice(2, 15),
    payment: input.method === "wechat" ? "wechat" : "alipay",
  };

  if (input.returnUrl) {
    params.return_url = input.returnUrl;
  }

  params.hash = signPayload(params, cfg.appSecret);

  const baseUrl = cfg.baseUrl ?? "https://api.xunhupay.com/payment/do.html";

  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });

    if (!res.ok) {
      throw new BillingError(
        `China payment gateway returned ${res.status}`,
        "CHINAPAY_REQUEST_FAILED",
        res.status,
      );
    }

    const data = (await res.json()) as Record<string, unknown>;

    if (data.errcode && data.errcode !== 0) {
      throw new BillingError(
        `China payment error: ${data.errmsg ?? "Unknown error"}`,
        "CHINAPAY_ORDER_FAILED",
        400,
      );
    }

    return {
      payUrl: String(data.url ?? data.url_qrcode ?? ""),
      orderId: String(data.order_id ?? ""),
      tradeOrderId: input.tradeOrderId,
    };
  } catch (error) {
    if (error instanceof BillingError) throw error;
    logger.error("China payment order creation failed", { error });
    throw new BillingError("Failed to create China payment order", "CHINAPAY_ERROR", 500, error);
  }
}

/**
 * Verify a payment webhook callback signature.
 * Call this in your webhook handler to verify the notification is authentic.
 */
export function verifyChinaPayWebhook(params: Record<string, string>): boolean {
  const cfg = getChinaPayConfig();
  const receivedHash = params.hash;
  if (!receivedHash) return false;

  const computed = signPayload(params, cfg.appSecret);
  return computed === receivedHash;
}

/**
 * Query order status from the gateway.
 */
export async function queryChinaPayOrder(tradeOrderId: string): Promise<{
  status: "paid" | "pending" | "failed";
  amount: string;
  paymentMethod: ChinaPayMethod;
}> {
  const cfg = getChinaPayConfig();

  const params: Record<string, string> = {
    appid: cfg.appId,
    out_trade_order: tradeOrderId,
    time: String(Math.floor(Date.now() / 1000)),
    nonce_str: Math.random().toString(36).slice(2, 15),
  };
  params.hash = signPayload(params, cfg.appSecret);

  const queryUrl = (cfg.baseUrl ?? "https://api.xunhupay.com/payment/do.html").replace(
    /\/do\.html$/,
    "/query.html",
  );

  try {
    const res = await fetch(queryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });

    const data = (await res.json()) as Record<string, unknown>;

    const statusMap: Record<string, "paid" | "pending" | "failed"> = {
      OD: "paid",
      WP: "pending",
      CD: "failed",
    };

    return {
      status: statusMap[String(data.status)] ?? "pending",
      amount: String(data.total_fee ?? "0"),
      paymentMethod: String(data.payment) === "wechat" ? "wechat" : "alipay",
    };
  } catch (error) {
    logger.error("China payment order query failed", {
      tradeOrderId,
      error,
    });
    return { status: "pending", amount: "0", paymentMethod: "alipay" };
  }
}
