/**
 * Auth fixture helpers for golden-path E2E tests.
 *
 * The repo uses Better Auth (see apps/web). Real session cookies require a
 * running database + auth server, so these helpers ship two strategies:
 *
 *   1. `signInViaUI(page, user)`  — drives the live /sign-in form. Use when
 *      the integrator has wired a seeded test DB.
 *   2. `injectMockSession(page, user)` — sets a placeholder cookie to satisfy
 *      naive middleware. **TODO(integrator):** replace with the real session
 *      token format (Better Auth: `better-auth.session_token`) once the test
 *      DB is reachable. Until then, downstream specs guard with `test.fixme()`.
 *
 * No production secrets belong in this file. The placeholder values exist
 * solely so `tsc --noEmit` and `playwright test --list` succeed.
 */

import type { BrowserContext, Page } from "@playwright/test";

export interface SampleUser {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
}

/** Deterministic, obviously-fake user. Never use in production. */
export const SAMPLE_USER: SampleUser = {
  email: "e2e+golden-path@example.test",
  password: "Test-Password-123!",
  displayName: "Golden Path Tester",
};

/** Web-app base URL — overridable per environment. */
export const APP_BASE_URL: string = process.env.APP_BASE_URL ?? "http://localhost:3000";

/** Landing-page base URL — overridable per environment. */
export const LANDING_BASE_URL: string = process.env.LANDING_BASE_URL ?? "http://localhost:3001";

/**
 * Whether the integrator has wired live services. When `false`, specs should
 * call `test.fixme(!isLiveEnv(), "...")` to mark themselves pending.
 */
export function isLiveEnv(): boolean {
  return process.env.E2E_LIVE === "1" || process.env.E2E_LIVE === "true";
}

/**
 * Drive the live sign-in form. Returns once navigation settles.
 * Throws if the page does not redirect away from /sign-in (caller should
 * surface a clearer error).
 */
export async function signInViaUI(page: Page, user: SampleUser): Promise<void> {
  await page.goto(`${APP_BASE_URL}/sign-in`);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 15_000,
  });
}

/**
 * Inject a placeholder session cookie. **Integrator TODO**: swap the value for
 * a real Better Auth session token minted by your test DB seeder.
 */
export async function injectMockSession(
  context: BrowserContext,
  _user: SampleUser = SAMPLE_USER,
): Promise<void> {
  const url = new URL(APP_BASE_URL);
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: "PLACEHOLDER_REPLACE_WITH_REAL_TOKEN",
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "Lax",
    },
  ]);
}
