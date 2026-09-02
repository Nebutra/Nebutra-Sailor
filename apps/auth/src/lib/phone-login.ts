import {
  type CountryCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js/min";

export type PhoneProvider = "twilio";

interface PhoneUiEnv {
  AUTH_ENABLED_PHONE_PROVIDERS?: string;
}

export interface TwilioVerifyEnv {
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_VERIFY_SERVICE_SID?: string;
}

export interface TwilioVerifyConfig {
  accountSid: string;
  authToken: string;
  serviceSid: string;
}

export function detectEnabledPhoneProviders(
  env: PhoneUiEnv = process.env as PhoneUiEnv,
): PhoneProvider[] {
  const configured = new Set(
    (env.AUTH_ENABLED_PHONE_PROVIDERS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  return configured.has("twilio") ? ["twilio"] : [];
}

export function resolveTwilioVerifyConfig(env: TwilioVerifyEnv): TwilioVerifyConfig | null {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const authToken = env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  const serviceSid = env.TWILIO_VERIFY_SERVICE_SID?.trim() ?? "";
  return accountSid && authToken && serviceSid ? { accountSid, authToken, serviceSid } : null;
}

export function isE164PhoneNumber(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/u.test(value) && isValidPhoneNumber(value);
}

export function normalizePhoneNumber(value: string, defaultCountry?: CountryCode): string | null {
  const parsed = parsePhoneNumberFromString(value, defaultCountry);
  return parsed?.isValid() ? parsed.number : null;
}

export function phoneNumberTempEmail(phoneNumber: string): string {
  return `phone-${phoneNumber.replace(/\D/gu, "")}@phone.nebutra.invalid`;
}
