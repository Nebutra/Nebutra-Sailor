/**
 * Auth fixture helpers for E2E tests.
 *
 * Auth-gated specs must only run against a deliberately configured test
 * target. This file detects that configuration and reports clear skip reasons
 * when it is missing; it does not mint or fake application sessions.
 *
 * No production secrets belong in this file. Provide real test-only values at
 * runtime through env vars such as E2E_TEST_USER_* or E2E_SESSION_COOKIE_VALUE.
 */

import type { BrowserContext, Page } from "@playwright/test";

type Env = Record<string, string | undefined>;
type SameSite = "Strict" | "Lax" | "None";

export interface SampleUser {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
}

export interface AuthCapabilityStatus {
  readonly ready: boolean;
  readonly reason: string;
  readonly missing: readonly string[];
}

export interface ConfiguredSessionCookie {
  readonly name: string;
  readonly value: string;
  readonly domain: string;
  readonly path: string;
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: SameSite;
}

export type AuthProvider = "better-auth" | "clerk" | "dev" | "nextauth" | "supabase" | "custom";

export type AuthCapability =
  | "auth-runtime"
  | "auth-smoke"
  | "ui-sign-in"
  | "session-cookie"
  | "password-reset-request"
  | "password-reset-token"
  | "onboarding-sign-up";

const FALLBACK_SAMPLE_USER: SampleUser = {
  email: "e2e+golden-path@example.test",
  password: "Test-Password-123!",
  displayName: "Golden Path Tester",
};

/** Web-app base URL — overridable per environment. */
export const APP_BASE_URL: string = process.env.APP_BASE_URL ?? "http://localhost:3000";

/** Landing-page base URL — overridable per environment. */
export const LANDING_BASE_URL: string = process.env.LANDING_BASE_URL ?? "http://localhost:3001";

export const SAMPLE_USER: SampleUser = getSampleUser();

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const PLACEHOLDER_PATTERNS = [
  /^placeholder$/i,
  /^placeholder[_-]/i,
  /[_-]placeholder$/i,
  /placeholder/i,
  /replace[_-]?with[_-]?real/i,
  /^change[-_]?me$/i,
  /^dummy$/i,
  /^fake$/i,
  /^pk_test_placeholder$/i,
  /^sk_test_placeholder$/i,
];

const AUTH_RUNTIME_ENV: Record<AuthProvider, readonly string[]> = {
  "better-auth": ["BETTER_AUTH_SECRET", "DATABASE_URL"],
  clerk: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"],
  dev: ["E2E_AUTH_READY=1"],
  nextauth: ["NEXTAUTH_SECRET", "DATABASE_URL"],
  supabase: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  custom: ["E2E_AUTH_READY=1"],
};

const DEFAULT_SESSION_COOKIE_NAME: Partial<Record<AuthProvider, string>> = {
  "better-auth": "better-auth.session_token",
  clerk: "__session",
  nextauth: "next-auth.session-token",
};

function readEnv(name: string, env: Env = process.env): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function isTruthyEnv(name: string, env: Env = process.env): boolean {
  const value = readEnv(name, env);
  return value ? TRUE_VALUES.has(value.toLowerCase()) : false;
}

function hasMeaningfulEnv(name: string, env: Env = process.env): boolean {
  const value = readEnv(name, env);
  if (!value) return false;
  return !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function missingEnv(names: readonly string[], env: Env): string[] {
  return names.filter((name) => {
    if (name.endsWith("=1")) {
      return !isTruthyEnv(name.slice(0, -2), env);
    }

    return !hasMeaningfulEnv(name, env);
  });
}

function readAuthProvider(env: Env = process.env): AuthProvider {
  const raw =
    readEnv("E2E_AUTH_PROVIDER", env) ??
    readEnv("NEXT_PUBLIC_AUTH_PROVIDER", env) ??
    readEnv("AUTH_PROVIDER", env) ??
    "clerk";
  const normalized = raw.toLowerCase();

  if (
    normalized === "better-auth" ||
    normalized === "clerk" ||
    normalized === "dev" ||
    normalized === "nextauth" ||
    normalized === "supabase"
  ) {
    return normalized;
  }

  return "custom";
}

function formatMissing(missing: readonly string[]): string {
  return missing.map((name) => `\`${name}\``).join(", ");
}

function statusFor(capability: AuthCapability, missing: readonly string[]): AuthCapabilityStatus {
  if (missing.length === 0) {
    return { ready: true, reason: "configured", missing };
  }

  return {
    ready: false,
    reason: `Skipped ${capability}: set ${formatMissing(missing)} for a real auth E2E target.`,
    missing,
  };
}

function runtimeMissing(env: Env): string[] {
  const provider = readAuthProvider(env);
  const missing = isTruthyEnv("E2E_LIVE", env) ? [] : ["E2E_LIVE=1"];

  missing.push(...missingEnv(AUTH_RUNTIME_ENV[provider], env));
  return missing;
}

function sessionCookieName(env: Env): string | undefined {
  return (
    readEnv("E2E_SESSION_COOKIE_NAME", env) ?? DEFAULT_SESSION_COOKIE_NAME[readAuthProvider(env)]
  );
}

function sessionCookieMissing(env: Env): string[] {
  const missing = runtimeMissing(env);

  if (!sessionCookieName(env)) {
    missing.push("E2E_SESSION_COOKIE_NAME");
  }

  if (!hasMeaningfulEnv("E2E_SESSION_COOKIE_VALUE", env)) {
    missing.push("E2E_SESSION_COOKIE_VALUE");
  }

  return missing;
}

function sameSite(env: Env): SameSite {
  const raw = readEnv("E2E_SESSION_COOKIE_SAME_SITE", env)?.toLowerCase();
  if (raw === "strict") return "Strict";
  if (raw === "none") return "None";
  return "Lax";
}

/**
 * Whether the integrator has opted into live E2E auth. Kept for older specs;
 * new auth-gated specs should prefer getAuthCapabilityStatus.
 */
export function isLiveEnv(env: Env = process.env): boolean {
  return isTruthyEnv("E2E_LIVE", env);
}

export function getSampleUser(env: Env = process.env): SampleUser {
  return {
    email: readEnv("E2E_TEST_USER_EMAIL", env) ?? FALLBACK_SAMPLE_USER.email,
    password: readEnv("E2E_TEST_USER_PASSWORD", env) ?? FALLBACK_SAMPLE_USER.password,
    displayName: readEnv("E2E_TEST_USER_NAME", env) ?? FALLBACK_SAMPLE_USER.displayName,
  };
}

export function getAuthCapabilityStatus(
  capability: AuthCapability,
  env: Env = process.env,
): AuthCapabilityStatus {
  const missing = runtimeMissing(env);

  if (capability === "auth-runtime") {
    return statusFor(capability, missing);
  }

  if (capability === "auth-smoke") {
    if (!isTruthyEnv("E2E_AUTH_SMOKE", env)) {
      missing.push("E2E_AUTH_SMOKE=1");
    }
    return statusFor(capability, missing);
  }

  if (capability === "ui-sign-in") {
    missing.push(...missingEnv(["E2E_TEST_USER_EMAIL", "E2E_TEST_USER_PASSWORD"], env));
    return statusFor(capability, missing);
  }

  if (capability === "session-cookie") {
    return statusFor(capability, sessionCookieMissing(env));
  }

  if (capability === "password-reset-request") {
    missing.push(...missingEnv(["E2E_TEST_USER_EMAIL", "E2E_EMAIL_CAPTURE=1"], env));
    return statusFor(capability, missing);
  }

  if (capability === "password-reset-token") {
    missing.push(
      ...missingEnv(["E2E_TEST_USER_EMAIL", "E2E_TEST_USER_PASSWORD", "E2E_RESET_TOKEN"], env),
    );
    return statusFor(capability, missing);
  }

  if (!isTruthyEnv("E2E_ONBOARDING_SIGNUP", env)) {
    missing.push("E2E_ONBOARDING_SIGNUP=1");
  }
  return statusFor(capability, missing);
}

export function getAuthSkipReason(
  capability: AuthCapability,
  env: Env = process.env,
): string | null {
  const status = getAuthCapabilityStatus(capability, env);
  return status.ready ? null : status.reason;
}

export function getConfiguredSessionCookie(env: Env = process.env): ConfiguredSessionCookie | null {
  const status = getAuthCapabilityStatus("session-cookie", env);
  if (!status.ready) return null;

  const url = new URL(readEnv("APP_BASE_URL", env) ?? APP_BASE_URL);
  const value = readEnv("E2E_SESSION_COOKIE_VALUE", env);
  const name = sessionCookieName(env);

  if (!name || !value) return null;

  return {
    name,
    value,
    domain: readEnv("E2E_SESSION_COOKIE_DOMAIN", env) ?? url.hostname,
    path: readEnv("E2E_SESSION_COOKIE_PATH", env) ?? "/",
    httpOnly: true,
    secure: readEnv("E2E_SESSION_COOKIE_SECURE", env)
      ? isTruthyEnv("E2E_SESSION_COOKIE_SECURE", env)
      : url.protocol === "https:",
    sameSite: sameSite(env),
  };
}

/**
 * Drive the live sign-in form. Returns once navigation settles.
 * Throws if the page does not redirect away from /sign-in (caller should
 * surface a clearer error).
 */
export async function signInViaUI(page: Page, user: SampleUser = getSampleUser()): Promise<void> {
  const status = getAuthCapabilityStatus("ui-sign-in");
  if (!status.ready) {
    throw new Error(status.reason);
  }

  await page.goto(`${APP_BASE_URL}/sign-in`);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 15_000,
  });
}

export async function injectConfiguredSession(context: BrowserContext): Promise<void> {
  const cookie = getConfiguredSessionCookie();
  if (!cookie) {
    throw new Error(getAuthCapabilityStatus("session-cookie").reason);
  }

  await context.addCookies([cookie]);
}
