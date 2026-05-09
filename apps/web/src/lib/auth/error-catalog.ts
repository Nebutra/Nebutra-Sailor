import type { AuthErrorKey } from "./error-keys";

/**
 * Map a raw error from Better Auth / Clerk / fetch into a stable AuthErrorKey.
 * The key is then resolved to a localized message via next-intl.
 */
export function resolveAuthErrorKey(error: unknown): AuthErrorKey {
  if (!error) return "unknown";

  if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
    return "networkError";
  }

  const code = extractCode(error);
  if (!code) return "unknown";

  return mapCodeToKey(code);
}

function extractCode(error: unknown): string | null {
  if (typeof error === "string") return error.toUpperCase();

  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;

    if (typeof obj.code === "string") return obj.code.toUpperCase();

    if (obj.error && typeof obj.error === "object") {
      const inner = obj.error as Record<string, unknown>;
      if (typeof inner.code === "string") return inner.code.toUpperCase();
      if (typeof inner.message === "string") return inner.message.toUpperCase();
    }

    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
      const first = obj.errors[0] as Record<string, unknown>;
      if (typeof first.code === "string") return first.code.toUpperCase();
      if (typeof first.message === "string") return first.message.toUpperCase();
    }

    if (typeof obj.message === "string") return obj.message.toUpperCase();
  }

  return null;
}

const CODE_TO_KEY: Record<string, AuthErrorKey> = {
  INVALID_CREDENTIALS: "invalidCredentials",
  INVALID_EMAIL_OR_PASSWORD: "invalidCredentials",
  USER_NOT_FOUND: "userNotFound",
  USER_ALREADY_EXISTS: "userAlreadyExists",
  EMAIL_ALREADY_IN_USE: "userAlreadyExists",
  WEAK_PASSWORD: "weakPassword",
  PASSWORD_TOO_WEAK: "weakPassword",
  PASSWORDS_DONT_MATCH: "passwordsDontMatch",
  PASSWORD_TOO_SHORT: "passwordTooShort",
  CURRENT_PASSWORD_INCORRECT: "currentPasswordIncorrect",
  INCORRECT_PASSWORD: "currentPasswordIncorrect",
  SAME_PASSWORD: "samePassword",
  INVALID_EMAIL: "invalidEmail",
  EMAIL_NOT_VERIFIED: "emailNotVerified",
  SESSION_EXPIRED: "sessionExpired",
  TWO_FACTOR_REQUIRED: "twoFactorRequired",
  INVALID_VERIFICATION_CODE: "invalidVerificationCode",
  INVALID_TWO_FACTOR_CODE: "invalidVerificationCode",
  TWO_FACTOR_ALREADY_ENABLED: "twoFactorAlreadyEnabled",
  TWO_FACTOR_NOT_ENABLED: "twoFactorNotEnabled",
  TOO_MANY_ATTEMPTS: "tooManyAttempts",
  RATE_LIMITED: "rateLimited",
  TOO_MANY_REQUESTS: "rateLimited",
  PROVIDER_NOT_SUPPORTED: "providerNotSupported",
  NETWORK_ERROR: "networkError",
};

function mapCodeToKey(rawCode: string): AuthErrorKey {
  if (CODE_TO_KEY[rawCode]) return CODE_TO_KEY[rawCode];

  for (const [code, key] of Object.entries(CODE_TO_KEY)) {
    if (rawCode.includes(code)) return key;
  }

  return "unknown";
}
