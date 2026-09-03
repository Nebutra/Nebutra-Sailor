// =============================================================================
// China payment rails — shared configuration
// =============================================================================
// Two independent, officially-documented merchant integrations live behind
// this module: WeChat Pay APIv3 (see wechat.ts) and Alipay Open Platform
// (see alipay.ts). Both require a real merchant account (营业执照 + the
// provider's own merchant onboarding) — there is no aggregator layer here,
// so there is no third party sitting between the merchant and the funds.
//
// This file used to configure a single "aggregator" (Xunhupay) that resells
// access to someone else's personal collection code. That violates both
// providers' merchant terms and offers no invoice, no dispute process, and
// no protection from being frozen without notice. It has been replaced.
// =============================================================================

export interface WechatPayConfig {
  /** WeChat Pay merchant id (mchid). */
  mchid: string;
  /** WeChat Open Platform / Official Account appid used for the order. */
  appId: string;
  /** Merchant API certificate private key, PEM-encoded. */
  privateKey: string;
  /** Serial number of the merchant API certificate matching `privateKey`. */
  serialNo: string;
  /** APIv3 key (32 bytes) used to decrypt platform certificates and notifications. */
  apiV3Key: string;
  /** Absolute HTTPS URL WeChat Pay calls on payment completion. */
  notifyUrl: string;
  /** Override for testing; defaults to the production APIv3 host. */
  baseUrl?: string;
}

export interface AlipayConfig {
  /** Alipay Open Platform app id. */
  appId: string;
  /** Merchant application private key, PEM-encoded (RSA2). */
  privateKey: string;
  /** Alipay's public key for the app, PEM-encoded — used to verify async notifications. */
  alipayPublicKey: string;
  /** Absolute HTTPS URL Alipay calls on payment completion. */
  notifyUrl: string;
  /** true for the Alipay sandbox (open.alipaydev.com). */
  sandbox?: boolean;
  /** Override for testing. */
  gatewayUrl?: string;
}

let wechatConfig: WechatPayConfig | null = null;
let alipayConfig: AlipayConfig | null = null;

export function initWechatPay(cfg: WechatPayConfig): void {
  wechatConfig = cfg;
}

export function initAlipay(cfg: AlipayConfig): void {
  alipayConfig = {
    ...cfg,
    gatewayUrl:
      cfg.gatewayUrl ??
      (cfg.sandbox
        ? "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
        : "https://openapi.alipay.com/gateway.do"),
  };
}

/** Reset cached in-memory config; test-only. */
export function resetChinaPayConfig(): void {
  wechatConfig = null;
  alipayConfig = null;
}

function normalizePemFromEnv(value: string): string {
  // Most CI/host secret stores cannot hold real newlines; accept `\n`-escaped
  // PEM as well as a literal multi-line PEM.
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

export function getWechatPayConfig(): WechatPayConfig {
  if (wechatConfig) return wechatConfig;

  const mchid = process.env.WECHATPAY_MCHID;
  const appId = process.env.WECHATPAY_APP_ID;
  const privateKey = process.env.WECHATPAY_PRIVATE_KEY;
  const serialNo = process.env.WECHATPAY_SERIAL_NO;
  const apiV3Key = process.env.WECHATPAY_API_V3_KEY;
  const notifyUrl = process.env.WECHATPAY_NOTIFY_URL;

  if (!mchid || !appId || !privateKey || !serialNo || !apiV3Key || !notifyUrl) {
    throw new Error(
      "WeChat Pay is not configured (WECHATPAY_MCHID, WECHATPAY_APP_ID, WECHATPAY_PRIVATE_KEY, " +
        "WECHATPAY_SERIAL_NO, WECHATPAY_API_V3_KEY, WECHATPAY_NOTIFY_URL)",
    );
  }

  wechatConfig = {
    mchid,
    appId,
    privateKey: normalizePemFromEnv(privateKey),
    serialNo,
    apiV3Key,
    notifyUrl,
    baseUrl: process.env.WECHATPAY_BASE_URL ?? "https://api.mch.weixin.qq.com",
  };
  return wechatConfig;
}

export function getAlipayConfig(): AlipayConfig {
  if (alipayConfig) return alipayConfig;

  const appId = process.env.ALIPAY_APP_ID;
  const privateKey = process.env.ALIPAY_PRIVATE_KEY;
  const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY;
  const notifyUrl = process.env.ALIPAY_NOTIFY_URL;

  if (!appId || !privateKey || !alipayPublicKey || !notifyUrl) {
    throw new Error(
      "Alipay is not configured (ALIPAY_APP_ID, ALIPAY_PRIVATE_KEY, ALIPAY_PUBLIC_KEY, ALIPAY_NOTIFY_URL)",
    );
  }

  const sandbox = process.env.ALIPAY_SANDBOX === "true";

  alipayConfig = {
    appId,
    privateKey: normalizePemFromEnv(privateKey),
    alipayPublicKey: normalizePemFromEnv(alipayPublicKey),
    notifyUrl,
    sandbox,
    gatewayUrl:
      process.env.ALIPAY_GATEWAY_URL ??
      (sandbox
        ? "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
        : "https://openapi.alipay.com/gateway.do"),
  };
  return alipayConfig;
}

function toPemBlock(base64: string, label: string): string {
  const lines = base64.match(/.{1,64}/g) ?? [base64];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

/** Wraps a bare base64 RSA key body in PEM headers if it isn't PEM already. */
export function ensurePem(
  value: string,
  label: "PRIVATE KEY" | "PUBLIC KEY" | "CERTIFICATE",
): string {
  if (value.includes("-----BEGIN")) return value;
  return toPemBlock(value.replace(/\s+/g, ""), label);
}
