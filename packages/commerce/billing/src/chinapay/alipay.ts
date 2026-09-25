import { createSign, createVerify } from "node:crypto";
import { logger } from "@nebutra/logger";
import { BillingError } from "../types";
import { type AlipayConfig, getAlipayConfig } from "./client";

// =============================================================================
// Alipay Open Platform — hand-rolled against the official spec
// (https://opendocs.alipay.com/open/02ekfg). No third-party SDK, same
// reasoning as wechat.ts: a merchant private key never leaves this file.
// =============================================================================

const log = logger.child({ service: "alipay" });

function alipayTimestamp(): string {
  // Alipay wants Beijing time, "yyyy-MM-dd HH:mm:ss".
  const beijing = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return beijing.toISOString().replace("T", " ").slice(0, 19);
}

function signContent(params: Record<string, string>, privateKeyPem: string): string {
  const content = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "" && k !== "sign")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  return createSign("RSA-SHA256").update(content, "utf8").sign(privateKeyPem, "base64");
}

function baseParams(
  cfg: AlipayConfig,
  method: string,
  bizContent: Record<string, unknown>,
): Record<string, string> {
  return {
    app_id: cfg.appId,
    method,
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: alipayTimestamp(),
    version: "1.0",
    notify_url: cfg.notifyUrl,
    biz_content: JSON.stringify(bizContent),
  };
}

// -----------------------------------------------------------------------------
// Order creation — `alipay.trade.precreate` returns a `qr_code` URL meant to
// be rendered as a QR code, matching the WeChat Pay Native flow above so the
// checkout page has one consistent "scan to pay" experience.
// -----------------------------------------------------------------------------

export interface CreateAlipayOrderInput {
  outTradeNo: string;
  subject: string;
  /** Total amount in CNY yuan, e.g. "9.90". */
  totalAmount: string;
  /** Opaque passthrough returned verbatim (URL-encoded) in the async notification. */
  passbackParams?: string;
}

export async function createAlipayPrecreateOrder(
  input: CreateAlipayOrderInput,
): Promise<{ qrCode: string }> {
  const cfg = getAlipayConfig();

  const params = baseParams(cfg, "alipay.trade.precreate", {
    out_trade_no: input.outTradeNo,
    total_amount: input.totalAmount,
    subject: input.subject,
  });
  if (input.passbackParams) {
    params.passback_params = encodeURIComponent(input.passbackParams);
  }
  params.sign = signContent(params, cfg.privateKey);

  const res = await fetch(cfg.gatewayUrl ?? "https://openapi.alipay.com/gateway.do", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });

  const data = (await res.json()) as Record<
    string,
    { code?: string; msg?: string; sub_msg?: string; qr_code?: string }
  >;
  const body = data.alipay_trade_precreate_response;

  if (!res.ok || !body || body.code !== "10000") {
    log.error("Alipay precreate order failed", { status: res.status, body });
    throw new BillingError(
      `Alipay order creation failed: ${body?.sub_msg ?? body?.msg ?? "unknown error"}`,
      "ALIPAY_PRECREATE_FAILED",
      400,
      body,
    );
  }

  if (!body.qr_code) {
    throw new BillingError(
      "Alipay precreate order returned no qr_code",
      "ALIPAY_MISSING_QR_CODE",
      502,
      body,
    );
  }

  return { qrCode: body.qr_code };
}

// -----------------------------------------------------------------------------
// Mobile website pay — `alipay.trade.wap.pay` for a buyer already on their
// phone. There is no server-to-server call: the signed request itself is the
// payment page, so the browser is sent to the gateway URL carrying it.
// -----------------------------------------------------------------------------

export interface CreateAlipayWapOrderInput extends CreateAlipayOrderInput {
  /** Where Alipay sends the browser after paying. */
  returnUrl?: string;
  /** Where the "back" link on Alipay's page goes if the buyer abandons. */
  quitUrl?: string;
}

export function buildAlipayWapPayUrl(input: CreateAlipayWapOrderInput): { payUrl: string } {
  const cfg = getAlipayConfig();

  const params = baseParams(cfg, "alipay.trade.wap.pay", {
    out_trade_no: input.outTradeNo,
    total_amount: input.totalAmount,
    subject: input.subject,
    product_code: "QUICK_WAP_WAY",
    ...(input.quitUrl ? { quit_url: input.quitUrl } : {}),
    ...(input.passbackParams ? { passback_params: encodeURIComponent(input.passbackParams) } : {}),
  });
  if (input.returnUrl) params.return_url = input.returnUrl;
  params.sign = signContent(params, cfg.privateKey);

  const gateway = cfg.gatewayUrl ?? "https://openapi.alipay.com/gateway.do";
  return { payUrl: `${gateway}?${new URLSearchParams(params).toString()}` };
}

export async function queryAlipayOrder(outTradeNo: string): Promise<{
  status: "paid" | "pending" | "failed";
  totalAmount: string;
  tradeNo?: string;
}> {
  const cfg = getAlipayConfig();
  const params = baseParams(cfg, "alipay.trade.query", { out_trade_no: outTradeNo });
  params.sign = signContent(params, cfg.privateKey);

  const res = await fetch(cfg.gatewayUrl ?? "https://openapi.alipay.com/gateway.do", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });

  const data = (await res.json()) as Record<
    string,
    { code?: string; trade_status?: string; total_amount?: string; trade_no?: string }
  >;
  const body = data.alipay_trade_query_response;

  const statusMap: Record<string, "paid" | "pending" | "failed"> = {
    TRADE_SUCCESS: "paid",
    TRADE_FINISHED: "paid",
    WAIT_BUYER_PAY: "pending",
    TRADE_CLOSED: "failed",
  };

  return {
    status: statusMap[body?.trade_status ?? ""] ?? "pending",
    totalAmount: body?.total_amount ?? "0",
    tradeNo: body?.trade_no,
  };
}

// -----------------------------------------------------------------------------
// Refunds. `out_request_no` is the idempotency key for partial refunds:
// retrying with the same one does not refund twice.
// -----------------------------------------------------------------------------

export interface RefundAlipayOrderInput {
  outTradeNo: string;
  outRequestNo: string;
  /** CNY yuan, e.g. "9.90". */
  refundAmount: string;
  reason?: string;
}

export async function refundAlipayOrder(
  input: RefundAlipayOrderInput,
): Promise<{ status: "succeeded" | "failed" }> {
  const cfg = getAlipayConfig();
  const params = baseParams(cfg, "alipay.trade.refund", {
    out_trade_no: input.outTradeNo,
    out_request_no: input.outRequestNo,
    refund_amount: input.refundAmount,
    ...(input.reason ? { refund_reason: input.reason } : {}),
  });
  params.sign = signContent(params, cfg.privateKey);

  const res = await fetch(cfg.gatewayUrl ?? "https://openapi.alipay.com/gateway.do", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });

  const data = (await res.json()) as Record<
    string,
    { code?: string; msg?: string; sub_msg?: string; fund_change?: string }
  >;
  const body = data.alipay_trade_refund_response;

  if (!res.ok || !body || body.code !== "10000") {
    log.error("Alipay refund failed", { status: res.status, body });
    throw new BillingError(
      `Alipay refund failed: ${body?.sub_msg ?? body?.msg ?? "unknown error"}`,
      "ALIPAY_REFUND_FAILED",
      400,
      body,
    );
  }

  // code 10000 with fund_change "N" means this out_request_no was already
  // refunded — the money moved on the earlier call, so it still succeeded.
  return { status: "succeeded" };
}

// -----------------------------------------------------------------------------
// Async notification verification. Alipay posts flat, URL-decoded form
// fields; the response body Alipay expects back is the literal string
// "success" or "failure" — not JSON, unlike WeChat Pay v3.
// -----------------------------------------------------------------------------

export interface AlipayNotificationFields {
  [key: string]: string | undefined;
  sign?: string;
  sign_type?: string;
  trade_status?: string;
  out_trade_no?: string;
  trade_no?: string;
  total_amount?: string;
  passback_params?: string;
  app_id?: string;
}

export function verifyAlipayNotification(fields: AlipayNotificationFields): boolean {
  const cfg = getAlipayConfig();
  const sign = fields.sign;
  if (!sign) return false;
  // A notification signed by Alipay but addressed to another app is still not ours.
  if (fields.app_id !== undefined && fields.app_id !== cfg.appId) return false;

  const toVerify: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (key === "sign" || key === "sign_type" || value === undefined) continue;
    toVerify[key] = value;
  }

  const content = Object.keys(toVerify)
    .sort()
    .map((k) => `${k}=${toVerify[k]}`)
    .join("&");

  try {
    return createVerify("RSA-SHA256")
      .update(content, "utf8")
      .verify(cfg.alipayPublicKey, sign, "base64");
  } catch (error) {
    log.error("Alipay notification signature verification threw", { error });
    return false;
  }
}

export const ALIPAY_NOTIFY_SUCCESS_BODIES = ["TRADE_SUCCESS", "TRADE_FINISHED"];
