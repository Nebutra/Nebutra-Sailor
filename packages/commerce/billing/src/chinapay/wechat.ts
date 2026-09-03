import {
  createDecipheriv,
  createSign,
  createVerify,
  randomBytes,
  X509Certificate,
} from "node:crypto";
import { logger } from "@nebutra/logger";
import { BillingError } from "../types";
import { getWechatPayConfig, type WechatPayConfig } from "./client";

// =============================================================================
// WeChat Pay APIv3 — hand-rolled against the official spec
// (https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml). No third-party SDK:
// this code signs, calls, and verifies directly with node:crypto so a
// merchant private key never passes through an unaudited dependency.
// =============================================================================

const log = logger.child({ service: "wechatpay" });

function nonceStr(): string {
  return randomBytes(16).toString("hex");
}

function timestampSeconds(): string {
  return String(Math.floor(Date.now() / 1000));
}

/** Builds the WECHATPAY2-SHA256-RSA2048 Authorization header for one request. */
function signRequest(
  cfg: WechatPayConfig,
  method: "GET" | "POST",
  urlPath: string,
  body: string,
): { authorization: string; timestamp: string; nonce: string } {
  const timestamp = timestampSeconds();
  const nonce = nonceStr();
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;

  const signature = createSign("RSA-SHA256").update(message).sign(cfg.privateKey, "base64");

  const authorization =
    'WECHATPAY2-SHA256-RSA2048 mchid="' +
    `${cfg.mchid}",nonce_str="${nonce}",timestamp="${timestamp}",` +
    `serial_no="${cfg.serialNo}",signature="${signature}"`;

  return { authorization, timestamp, nonce };
}

async function wechatRequest<T>(
  cfg: WechatPayConfig,
  method: "GET" | "POST",
  urlPath: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const bodyText = body ? JSON.stringify(body) : "";
  const { authorization } = signRequest(cfg, method, urlPath, bodyText);
  const baseUrl = cfg.baseUrl ?? "https://api.mch.weixin.qq.com";

  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: {
      Authorization: authorization,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      "User-Agent": "nebutra-sailor/wechatpay-v3",
    },
    body: body ? bodyText : undefined,
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!res.ok) {
    throw new BillingError(
      `WeChat Pay request failed: ${(data.message as string) ?? res.statusText}`,
      (data.code as string) ?? "WECHATPAY_REQUEST_FAILED",
      res.status,
      data,
    );
  }

  return data as T;
}

// -----------------------------------------------------------------------------
// Order creation — Native (QR code) pay. `code_url` is a `weixin://wxpay/...`
// URI meant to be rendered as a QR code on the checkout page, not opened as
// an http redirect.
// -----------------------------------------------------------------------------

export interface CreateWechatNativeOrderInput {
  outTradeNo: string;
  description: string;
  /** Total amount in CNY fen (integer cents), per the WeChat Pay APIv3 contract. */
  totalFen: number;
  /** Opaque passthrough returned verbatim in the payment notification. Max 128 bytes UTF-8. */
  attach?: string;
}

export async function createWechatNativeOrder(
  input: CreateWechatNativeOrderInput,
): Promise<{ codeUrl: string }> {
  const cfg = getWechatPayConfig();

  if (input.attach && Buffer.byteLength(input.attach, "utf8") > 128) {
    throw new BillingError(
      "WeChat Pay attach payload exceeds 128 bytes",
      "WECHATPAY_ATTACH_TOO_LARGE",
      400,
    );
  }

  const data = await wechatRequest<{ code_url: string }>(
    cfg,
    "POST",
    "/v3/pay/transactions/native",
    {
      mchid: cfg.mchid,
      appid: cfg.appId,
      description: input.description,
      out_trade_no: input.outTradeNo,
      notify_url: cfg.notifyUrl,
      amount: { total: input.totalFen, currency: "CNY" },
      ...(input.attach ? { attach: input.attach } : {}),
    },
  );

  return { codeUrl: data.code_url };
}

export async function queryWechatOrder(outTradeNo: string): Promise<{
  status: "paid" | "pending" | "failed";
  amountFen: number;
}> {
  const cfg = getWechatPayConfig();
  const data = await wechatRequest<{ trade_state: string; amount?: { total?: number } }>(
    cfg,
    "GET",
    `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${cfg.mchid}`,
  );

  const status: "paid" | "pending" | "failed" =
    data.trade_state === "SUCCESS"
      ? "paid"
      : data.trade_state === "NOTPAY" || data.trade_state === "USERPAYING"
        ? "pending"
        : "failed";

  return { status, amountFen: data.amount?.total ?? 0 };
}

// -----------------------------------------------------------------------------
// Platform certificates — needed to verify inbound notification signatures.
// WeChat Pay rotates these; cache in-process and refetch on unknown serial or
// after the TTL.
// -----------------------------------------------------------------------------

interface PlatformCertEntry {
  publicKeyPem: string;
  expireTime: number;
}

let platformCertCache: Map<string, PlatformCertEntry> = new Map();
let platformCertFetchedAt = 0;
const PLATFORM_CERT_TTL_MS = 12 * 60 * 60 * 1000;

function decryptAeadAes256Gcm(
  apiV3Key: string,
  nonce: string,
  associatedData: string,
  ciphertextBase64: string,
): string {
  const raw = Buffer.from(ciphertextBase64, "base64");
  const authTag = raw.subarray(raw.length - 16);
  const ciphertext = raw.subarray(0, raw.length - 16);

  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(apiV3Key, "utf8"),
    Buffer.from(nonce, "utf8"),
  );
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, "utf8"));

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

async function refreshPlatformCertificates(cfg: WechatPayConfig): Promise<void> {
  const data = await wechatRequest<{
    data: Array<{
      serial_no: string;
      expire_time: string;
      encrypt_certificate: {
        algorithm: string;
        nonce: string;
        associated_data: string;
        ciphertext: string;
      };
    }>;
  }>(cfg, "GET", "/v3/certificates");

  const next = new Map<string, PlatformCertEntry>();
  for (const entry of data.data) {
    const pem = decryptAeadAes256Gcm(
      cfg.apiV3Key,
      entry.encrypt_certificate.nonce,
      entry.encrypt_certificate.associated_data,
      entry.encrypt_certificate.ciphertext,
    );
    next.set(entry.serial_no, {
      publicKeyPem: new X509Certificate(pem).publicKey
        .export({ type: "spki", format: "pem" })
        .toString(),
      expireTime: Date.parse(entry.expire_time),
    });
  }
  platformCertCache = next;
  platformCertFetchedAt = Date.now();
}

async function getPlatformPublicKey(cfg: WechatPayConfig, serialNo: string): Promise<string> {
  const stale = Date.now() - platformCertFetchedAt > PLATFORM_CERT_TTL_MS;
  if (stale || !platformCertCache.has(serialNo)) {
    await refreshPlatformCertificates(cfg);
  }

  const entry = platformCertCache.get(serialNo);
  if (!entry) {
    throw new BillingError(
      "Unknown WeChat Pay platform certificate serial",
      "WECHATPAY_UNKNOWN_CERT_SERIAL",
      400,
    );
  }
  return entry.publicKeyPem;
}

/** Test-only: reset the platform certificate cache. */
export function resetWechatPlatformCertCache(): void {
  platformCertCache = new Map();
  platformCertFetchedAt = 0;
}

/** Test-only: seed the platform certificate cache without a network call. */
export function seedWechatPlatformCertCache(serialNo: string, publicKeyPem: string): void {
  platformCertCache.set(serialNo, { publicKeyPem, expireTime: Date.now() + PLATFORM_CERT_TTL_MS });
  platformCertFetchedAt = Date.now();
}

// -----------------------------------------------------------------------------
// Notification verification — WeChat Pay v3 signs every callback and encrypts
// the payment resource. Both steps are mandatory: a payload that decrypts
// cleanly but carries a forged/missing signature must be rejected.
// -----------------------------------------------------------------------------

export interface WechatNotificationHeaders {
  timestamp: string;
  nonce: string;
  signature: string;
  serial: string;
}

export interface WechatNotificationEnvelope {
  id: string;
  event_type: string;
  resource: { algorithm: string; nonce: string; associated_data: string; ciphertext: string };
}

export interface WechatPaymentResource {
  out_trade_no: string;
  transaction_id: string;
  trade_state: string;
  attach?: string;
  amount?: { total?: number; payer_total?: number; currency?: string };
}

export async function verifyAndDecryptWechatNotification(
  headers: WechatNotificationHeaders,
  rawBody: string,
): Promise<WechatPaymentResource> {
  const cfg = getWechatPayConfig();
  const publicKeyPem = await getPlatformPublicKey(cfg, headers.serial);

  const message = `${headers.timestamp}\n${headers.nonce}\n${rawBody}\n`;
  const valid = createVerify("RSA-SHA256")
    .update(message)
    .verify(publicKeyPem, headers.signature, "base64");

  if (!valid) {
    throw new BillingError(
      "WeChat Pay notification signature is invalid",
      "WECHATPAY_BAD_SIGNATURE",
      400,
    );
  }

  const envelope = JSON.parse(rawBody) as WechatNotificationEnvelope;

  if (envelope.event_type !== "TRANSACTION.SUCCESS") {
    log.info("Ignoring non-success WeChat Pay notification", { eventType: envelope.event_type });
  }

  const plaintext = decryptAeadAes256Gcm(
    cfg.apiV3Key,
    envelope.resource.nonce,
    envelope.resource.associated_data,
    envelope.resource.ciphertext,
  );

  return JSON.parse(plaintext) as WechatPaymentResource;
}

/** Success response body required by the WeChat Pay v3 notification contract. */
export const WECHAT_NOTIFY_OK = { code: "SUCCESS", message: "成功" } as const;
export const WECHAT_NOTIFY_FAIL = (message: string) => ({ code: "FAIL", message }) as const;
