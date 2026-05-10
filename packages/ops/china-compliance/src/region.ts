/**
 * Region detection — pure helper.
 *
 * Reads env only. No fetch, no IP lookup, no `navigator`. The host app is
 * responsible for deciding HOW to derive region (CDN header, geo-IP, user
 * preference) and exposing the result via env. This keeps the helper safe
 * to call from server, client, or test code.
 */

export type ChinaRegion = "cn-mainland" | "cn-hk-mo-tw" | "overseas" | "unknown";

const VALID_REGIONS: readonly ChinaRegion[] = ["cn-mainland", "cn-hk-mo-tw", "overseas", "unknown"];

function readEnv(name: string): string | undefined {
  // Guard: in some bundler contexts `process` is undefined.
  if (typeof process === "undefined" || process.env === undefined) {
    return undefined;
  }
  const v = process.env[name];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function normalize(value: string | undefined): ChinaRegion | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase().trim();
  if (VALID_REGIONS.includes(lower as ChinaRegion)) {
    return lower as ChinaRegion;
  }
  // Tolerate common synonyms.
  if (lower === "cn" || lower === "china" || lower === "mainland") {
    return "cn-mainland";
  }
  if (lower === "hk" || lower === "mo" || lower === "tw" || lower === "hkt" || lower === "hkmotw") {
    return "cn-hk-mo-tw";
  }
  if (lower === "global" || lower === "us" || lower === "eu" || lower === "world") {
    return "overseas";
  }
  return undefined;
}

/**
 * Detect the deployment region from env. Order of precedence:
 *
 *   1. `NEBUTRA_REGION`  (server-side override)
 *   2. `NEXT_PUBLIC_REGION` (build-time / public override)
 *   3. fallback: `"unknown"`
 */
export function detectChinaRegion(): ChinaRegion {
  const fromServer = normalize(readEnv("NEBUTRA_REGION"));
  if (fromServer) return fromServer;

  const fromPublic = normalize(readEnv("NEXT_PUBLIC_REGION"));
  if (fromPublic) return fromPublic;

  return "unknown";
}

/**
 * `true` when the deployment is targeting mainland China specifically.
 * HK/MO/TW does not count — they have different CDN / payment behavior.
 */
export function isChinaRegion(): boolean {
  return detectChinaRegion() === "cn-mainland";
}

export interface CDNHints {
  /** Skip Google Fonts / gstatic — blocked or slow in mainland. */
  shouldAvoidGoogleFonts: boolean;
  /** Prefer Aliyun SMS over Twilio. */
  shouldUseAliyunSMS: boolean;
  /** Surface Alipay as a payment method. */
  shouldUseAlipay: boolean;
  /** Surface WeChat Pay as a payment method. */
  shouldUseWeChatPay: boolean;
}

/**
 * Region-aware boolean hints for host apps. Pure function of
 * `detectChinaRegion()`.
 */
export function getCDNHints(): CDNHints {
  const region = detectChinaRegion();

  if (region === "cn-mainland") {
    return {
      shouldAvoidGoogleFonts: true,
      shouldUseAliyunSMS: true,
      shouldUseAlipay: true,
      shouldUseWeChatPay: true,
    };
  }

  if (region === "cn-hk-mo-tw") {
    // HK/MO/TW: Google Fonts work; Alipay HK / WeChat Pay HK still desirable.
    return {
      shouldAvoidGoogleFonts: false,
      shouldUseAliyunSMS: false,
      shouldUseAlipay: true,
      shouldUseWeChatPay: true,
    };
  }

  // overseas + unknown → conservative defaults (no China-specific surfaces)
  return {
    shouldAvoidGoogleFonts: false,
    shouldUseAliyunSMS: false,
    shouldUseAlipay: false,
    shouldUseWeChatPay: false,
  };
}
