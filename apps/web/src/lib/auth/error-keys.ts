export const AUTH_ERROR_KEYS = [
  "invalidCredentials",
  "userNotFound",
  "userAlreadyExists",
  "weakPassword",
  "passwordsDontMatch",
  "passwordTooShort",
  "currentPasswordIncorrect",
  "samePassword",
  "invalidEmail",
  "emailNotVerified",
  "sessionExpired",
  "twoFactorRequired",
  "invalidVerificationCode",
  "twoFactorAlreadyEnabled",
  "twoFactorNotEnabled",
  "tooManyAttempts",
  "rateLimited",
  "providerNotSupported",
  "networkError",
  "unknown",
] as const;

export type AuthErrorKey = (typeof AUTH_ERROR_KEYS)[number];
