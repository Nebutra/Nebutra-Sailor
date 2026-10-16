import { isMainlandMarket } from "@nebutra/contracts/market";
import { createAliyunProvider } from "./providers/aliyun";
import { createTwilioVerifyProvider } from "./providers/twilio-verify";
import type { SmsProvider } from "./types";

export type SmsProviderId = "aliyun" | "twilio-verify";

type Env = Record<string, string | undefined>;

/** Aliyun SMS has every key it needs. */
export function isAliyunSmsConfigured(env: Env = process.env): boolean {
  return Boolean(
    env.ALIYUN_SMS_ACCESS_KEY_ID &&
      env.ALIYUN_SMS_ACCESS_KEY_SECRET &&
      env.ALIYUN_SMS_SIGN_NAME &&
      env.ALIYUN_SMS_TEMPLATE_CODE,
  );
}

/** Twilio Verify has every key it needs. */
export function isTwilioVerifyConfigured(env: Env = process.env): boolean {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SERVICE_SID);
}

/**
 * Which SMS provider this deployment uses — the legal pair of ADR 2026-09-24
 * §2: Aliyun for mainland China, Twilio Verify elsewhere.
 *
 * - `SMS_PROVIDER=aliyun|twilio-verify` wins when set.
 * - `NEBUTRA_LOCALE=cn`: Aliyun when configured, else Twilio Verify.
 * - Otherwise: Twilio Verify when configured, else Aliyun.
 * - Neither configured: `null` — phone verification is off.
 */
export function resolveSmsProviderId(env: Env = process.env): SmsProviderId | null {
  const explicit = env.SMS_PROVIDER?.trim();
  if (explicit === "aliyun" || explicit === "twilio-verify") return explicit;

  const aliyun = isAliyunSmsConfigured(env);
  const twilio = isTwilioVerifyConfigured(env);
  if (isMainlandMarket(env)) {
    if (aliyun) return "aliyun";
    return twilio ? "twilio-verify" : null;
  }
  if (twilio) return "twilio-verify";
  return aliyun ? "aliyun" : null;
}

/** Create the provider `resolveSmsProviderId` picks, or `null` when none is configured. */
export function createSmsProvider(env: Env = process.env): SmsProvider | null {
  const id = resolveSmsProviderId(env);
  if (id === "aliyun") {
    return createAliyunProvider({
      accessKeyId: env.ALIYUN_SMS_ACCESS_KEY_ID ?? "",
      accessKeySecret: env.ALIYUN_SMS_ACCESS_KEY_SECRET ?? "",
      signName: env.ALIYUN_SMS_SIGN_NAME ?? "",
      templateCode: env.ALIYUN_SMS_TEMPLATE_CODE ?? "",
    });
  }
  if (id === "twilio-verify") {
    return createTwilioVerifyProvider({
      accountSid: env.TWILIO_ACCOUNT_SID ?? "",
      authToken: env.TWILIO_AUTH_TOKEN ?? "",
      serviceSid: env.TWILIO_VERIFY_SERVICE_SID ?? "",
    });
  }
  return null;
}
