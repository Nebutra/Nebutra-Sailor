import { logger } from "@nebutra/logger";
import type { SmsProvider } from "../types";

export interface TwilioVerifyConfig {
  accountSid: string;
  authToken: string;
  serviceSid: string;
}

export interface TwilioVerifyProvider extends SmsProvider {
  verify(phone: string, code: string): Promise<boolean>;
}

function assertTwilioVerifyConfig(config: TwilioVerifyConfig): void {
  const missing = [
    ["accountSid", config.accountSid],
    ["authToken", config.authToken],
    ["serviceSid", config.serviceSid],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Twilio Verify configuration missing: ${missing.join(", ")}`);
  }
}

function basicAuthorization(accountSid: string, authToken: string): string {
  return `Basic ${btoa(`${accountSid}:${authToken}`)}`;
}

export function createTwilioVerifyProvider(config?: TwilioVerifyConfig): TwilioVerifyProvider {
  const cfg = config ?? {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    serviceSid: process.env.TWILIO_VERIFY_SERVICE_SID ?? "",
  };
  assertTwilioVerifyConfig(cfg);

  const baseUrl = `https://verify.twilio.com/v2/Services/${encodeURIComponent(cfg.serviceSid)}`;
  const headers = {
    authorization: basicAuthorization(cfg.accountSid, cfg.authToken),
    "content-type": "application/x-www-form-urlencoded",
  };

  async function request(
    path: string,
    body: URLSearchParams,
  ): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });
      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        logger.warn("Twilio Verify request failed", {
          status: response.status,
          code: typeof payload?.code === "number" ? payload.code : undefined,
        });
        return null;
      }
      return payload;
    } catch (error) {
      logger.error("Twilio Verify request failed", error instanceof Error ? error : undefined, {
        provider: "twilio-verify",
      });
      return null;
    }
  }

  return {
    name: "twilio-verify",
    async send(phone: string, _code: string): Promise<boolean> {
      const payload = await request(
        "/Verifications",
        new URLSearchParams({ To: phone, Channel: "sms" }),
      );
      return payload?.status === "pending";
    },
    async verify(phone: string, code: string): Promise<boolean> {
      const payload = await request(
        "/VerificationCheck",
        new URLSearchParams({ To: phone, Code: code }),
      );
      return payload?.status === "approved";
    },
  };
}
