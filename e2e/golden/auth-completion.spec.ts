/**
 * Golden Path 1: Auth completion — forgot password → email link → reset → sign in.
 *
 * This test documents the full credential-recovery flow. It requires:
 *   - a running web app (apps/web) at APP_BASE_URL
 *   - an email capture mechanism (mailpit / Resend test mode / Postmark sandbox)
 *   - a seeded test user in the auth DB
 *
 * Until the integrator wires those, tests skip with the missing E2E auth
 * capability so CI stays green without pretending a session exists.
 */

import { expect, test } from "@playwright/test";
import { APP_BASE_URL, getAuthCapabilityStatus, getSampleUser } from "../fixtures/auth";

test.describe("Auth completion — forgot password to reset to sign in", () => {
  test.describe("password reset request", () => {
    const auth = getAuthCapabilityStatus("password-reset-request");
    test.skip(!auth.ready, auth.reason);

    test("requests password reset email", async ({ page }) => {
      const user = getSampleUser();
      await page.goto(`${APP_BASE_URL}/sign-in`);
      await page.getByRole("link", { name: /forgot.*password/i }).click();
      await page.getByLabel(/email/i).fill(user.email);
      await page.getByRole("button", { name: /send.*reset|reset.*link/i }).click();
      await expect(page.getByText(/check.*email|reset link sent/i)).toBeVisible();
    });
  });

  test.describe("captured reset token", () => {
    const auth = getAuthCapabilityStatus("password-reset-token");
    test.skip(!auth.ready, auth.reason);

    test("follows reset link and lands on reset page", async ({ page }) => {
      const token = process.env.E2E_RESET_TOKEN?.trim() ?? "";
      await page.goto(`${APP_BASE_URL}/reset-password?token=${token}`);
      await expect(page.getByRole("heading", { name: /reset.*password/i })).toBeVisible();
    });

    test("submits new password and signs in successfully", async ({ page }) => {
      const user = getSampleUser();
      const token = process.env.E2E_RESET_TOKEN?.trim() ?? "";
      const newPassword = process.env.E2E_RESET_NEW_PASSWORD?.trim() ?? `Reset-${Date.now()}-456!`;

      await page.goto(`${APP_BASE_URL}/reset-password?token=${token}`);
      await page.getByLabel(/new.*password/i).fill(newPassword);
      await page.getByLabel(/confirm.*password/i).fill(newPassword);
      await page.getByRole("button", { name: /reset.*password|update/i }).click();

      // After reset the app should redirect to /sign-in or auto-sign-in.
      await page.waitForURL(/\/(sign-in|onboarding|$)/, { timeout: 15_000 });

      // Verify the new credentials work.
      if (page.url().includes("/sign-in")) {
        await page.getByLabel(/email/i).fill(user.email);
        await page.getByLabel(/password/i).fill(newPassword);
        await page.getByRole("button", { name: /sign in|log in/i }).click();
        await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
      }

      await expect(page).not.toHaveURL(/\/sign-in/);
    });
  });
});
