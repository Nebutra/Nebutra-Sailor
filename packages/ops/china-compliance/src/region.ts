/**
 * Region detection — pure helper.
 *
 * Reads env only. No fetch, no IP lookup, no `navigator`. The host app is
 * responsible for deciding HOW to derive region (CDN header, geo-IP, user
 * preference) and exposing the result via env. This keeps the helper safe
 * to call from server, client, or test code.
 */

import { detectMarket, type MarketRegion } from "@nebutra/contracts/market";

export type ChinaRegion = MarketRegion;

/**
 * Detect the deployment region from env — the one switch is
 * `NEBUTRA_LOCALE=cn` (server) / `NEXT_PUBLIC_NEBUTRA_LOCALE=cn` (client
 * mirror). `NEBUTRA_REGION` and `NEXT_PUBLIC_REGION` are kept as aliases.
 * The precedence and parsing live in `@nebutra/contracts/market`, shared with
 * billing, SMS and the compliance UI.
 */
export function detectChinaRegion(): ChinaRegion {
  return detectMarket();
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
