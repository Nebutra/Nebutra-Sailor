/**
 * Golden Path 2: Onboarding wizard — signup → workspace → invite → choose plan → /.
 *
 * Drives the multi-step onboarding form at `/onboarding`. Requires a running
 * web app, a seeded auth provider, and a billing provider in test mode.
 */

import { expect, test } from "@playwright/test";
import { APP_BASE_URL, isLiveEnv } from "../fixtures/auth";

test.describe.configure({ mode: "serial" });

test.describe("Onboarding wizard golden path", () => {
  test("signup → workspace step → invite step → choose-plan → dashboard", async ({ page }) => {
    test.fixme(!isLiveEnv(), "Requires running web app + auth DB + billing test mode");

    const uniqueEmail = `e2e+onboarding-${Date.now()}@example.test`;
    const password = "Onboarding-Test-789!";

    // 1. Signup
    await page.goto(`${APP_BASE_URL}/sign-up`);
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign up|create account/i }).click();

    // 2. Step 1 — workspace
    await page.waitForURL(/\/onboarding/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /workspace|create.*workspace/i })).toBeVisible();
    await page.getByLabel(/workspace.*name|organization.*name/i).fill("E2E Golden Workspace");
    await page.getByRole("button", { name: /next|continue/i }).click();

    // 3. Step 2 — invite teammates (skippable)
    await expect(page.getByRole("heading", { name: /invite|teammates/i })).toBeVisible();
    await page.getByRole("button", { name: /skip|next|continue/i }).click();

    // 4. Step 3 — choose plan
    await expect(page.getByRole("heading", { name: /plan|choose.*plan|pricing/i })).toBeVisible();
    await page
      .getByRole("button", { name: /free|continue with free|select free/i })
      .first()
      .click();

    // 5. Land on dashboard root
    await page.waitForURL((url) => url.pathname === "/" || url.pathname.startsWith("/dashboard"), {
      timeout: 20_000,
    });
    await expect(page).not.toHaveURL(/\/onboarding/);
  });
});
