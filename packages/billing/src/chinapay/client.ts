import { createHmac } from "node:crypto";

export interface ChinaPayConfig {
  appId: string;
  appSecret: string;
  /** Base URL for the payment gateway. Defaults to Xunhupay. Override for other aggregators. */
  baseUrl?: string;
  /** Callback URL for payment notifications */
  notifyUrl: string;
}

let config: ChinaPayConfig | null = null;

export function initChinaPay(cfg: ChinaPayConfig): void {
  config = cfg;
}

export function getChinaPayConfig(): ChinaPayConfig {
  if (!config) {
    const appId = process.env.CHINAPAY_APP_ID;
    const appSecret = process.env.CHINAPAY_APP_SECRET;
    const notifyUrl = process.env.CHINAPAY_NOTIFY_URL;
    if (!appId || !appSecret || !notifyUrl) {
      throw new Error(
        "China payment credentials not configured (CHINAPAY_APP_ID, CHINAPAY_APP_SECRET, CHINAPAY_NOTIFY_URL)",
      );
    }
    config = {
      appId,
      appSecret,
      baseUrl: process.env.CHINAPAY_BASE_URL ?? "https://api.xunhupay.com/payment/do.html",
      notifyUrl,
    };
  }
  return config;
}

/**
 * Generate HMAC-MD5 signature for payment request.
 * Chinese payment gateways typically use MD5 signing.
 */
export function signPayload(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params)
    .filter((k) => k !== "hash" && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHmac("md5", secret).update(sorted).digest("hex");
}
