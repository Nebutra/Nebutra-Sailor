import { describe, expect, it } from "vitest";
import { resolveAuthErrorKey } from "../error-catalog";

describe("resolveAuthErrorKey", () => {
  it("returns 'unknown' for null/undefined", () => {
    expect(resolveAuthErrorKey(null)).toBe("unknown");
    expect(resolveAuthErrorKey(undefined)).toBe("unknown");
  });

  it("recognizes a TypeError fetch failure as networkError", () => {
    const err = new TypeError("Failed to fetch");
    expect(resolveAuthErrorKey(err)).toBe("networkError");
  });

  it("maps Better Auth INVALID_EMAIL_OR_PASSWORD to invalidCredentials", () => {
    const err = { code: "INVALID_EMAIL_OR_PASSWORD" };
    expect(resolveAuthErrorKey(err)).toBe("invalidCredentials");
  });

  it("maps Better Auth USER_ALREADY_EXISTS to userAlreadyExists", () => {
    expect(resolveAuthErrorKey({ code: "USER_ALREADY_EXISTS" })).toBe("userAlreadyExists");
  });

  it("maps WEAK_PASSWORD variants", () => {
    expect(resolveAuthErrorKey({ code: "WEAK_PASSWORD" })).toBe("weakPassword");
    expect(resolveAuthErrorKey({ code: "PASSWORD_TOO_WEAK" })).toBe("weakPassword");
  });

  it("maps CURRENT_PASSWORD_INCORRECT and INCORRECT_PASSWORD to currentPasswordIncorrect", () => {
    expect(resolveAuthErrorKey({ code: "CURRENT_PASSWORD_INCORRECT" })).toBe(
      "currentPasswordIncorrect",
    );
    expect(resolveAuthErrorKey({ code: "INCORRECT_PASSWORD" })).toBe("currentPasswordIncorrect");
  });

  it("maps two-factor error codes", () => {
    expect(resolveAuthErrorKey({ code: "TWO_FACTOR_REQUIRED" })).toBe("twoFactorRequired");
    expect(resolveAuthErrorKey({ code: "INVALID_TWO_FACTOR_CODE" })).toBe(
      "invalidVerificationCode",
    );
    expect(resolveAuthErrorKey({ code: "TWO_FACTOR_ALREADY_ENABLED" })).toBe(
      "twoFactorAlreadyEnabled",
    );
  });

  it("maps rate limit codes", () => {
    expect(resolveAuthErrorKey({ code: "TOO_MANY_REQUESTS" })).toBe("rateLimited");
    expect(resolveAuthErrorKey({ code: "TOO_MANY_ATTEMPTS" })).toBe("tooManyAttempts");
  });

  it("reads code from Clerk-shaped error.errors[0]", () => {
    const clerkError = {
      errors: [{ code: "USER_NOT_FOUND", message: "No user" }],
    };
    expect(resolveAuthErrorKey(clerkError)).toBe("userNotFound");
  });

  it("reads code from nested error.error.code", () => {
    expect(resolveAuthErrorKey({ error: { code: "SESSION_EXPIRED" } })).toBe("sessionExpired");
  });

  it("falls back to 'unknown' for unrecognized codes", () => {
    expect(resolveAuthErrorKey({ code: "TOTALLY_RANDOM_THING" })).toBe("unknown");
    expect(resolveAuthErrorKey({})).toBe("unknown");
  });

  it("matches partial codes via substring fallback", () => {
    expect(resolveAuthErrorKey({ code: "auth.INVALID_CREDENTIALS.boom" })).toBe(
      "invalidCredentials",
    );
  });
});
