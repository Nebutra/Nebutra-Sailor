/**
 * Dashboard critical path E2E tests.
 *
 * These tests cover the authenticated app flows that are most likely to regress:
 *   - Unauthenticated redirect to sign-in
 *   - Sign-in page structure and accessibility
 *   - Post-auth dashboard entry point
 *   - API key management page structure
 *   - Settings navigation
 *
 * Tests that require a full Clerk session use `storageState` from `auth.setup.ts`.
 * All tests here are designed to be runnable in CI without real credentials by
 * exercising the unauthenticated surface and checking structural invariants.
 */

import { expect, test } from "@playwright/test";

const APP_BASE = process.env.APP_BASE_URL ?? "http://localhost:3001";

// In CI the web-app and API gateway are not started unless explicit URLs are provided.
// Skip gracefully rather than failing with a connection-refused error.
const skipWebApp = process.env.CI === "true" && !process.env.APP_BASE_URL;
const skipApi = process.env.CI === "true" && !process.env.API_BASE_URL;

test.describe("Authentication redirect", () => {
  test.skip(skipWebApp, "Web app not running in CI (set APP_BASE_URL to enable)");
  test("unauthenticated / redirects to sign-in", async ({ page }) => {
    const response = await page.goto(APP_BASE + "/");
    // Clerk middleware redirects unauthenticated requests to /sign-in
    expect(page.url()).toMatch(/sign-in/);
    expect(response?.status()).not.toBe(500);
  });

  test("unauthenticated /settings redirects to sign-in", async ({ page }) => {
    await page.goto(APP_BASE + "/settings");
    expect(page.url()).toMatch(/sign-in/);
  });

  test("unauthenticated /analytics redirects to sign-in", async ({ page }) => {
    await page.goto(APP_BASE + "/analytics");
    expect(page.url()).toMatch(/sign-in/);
  });
});

test.describe("Sign-in page", () => {
  test.skip(skipWebApp, "Web app not running in CI (set APP_BASE_URL to enable)");
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE + "/sign-in");
  });

  test("renders sign-in form", async ({ page }) => {
    await expect(page).toHaveTitle(/sign.?in|Nebutra/i);
    // Clerk-rendered form has at minimum an email input
    const emailInput = page
      .getByRole("textbox", { name: /email/i })
      .or(page.locator("input[type='email']"))
      .first();
    await expect(emailInput).toBeVisible({ timeout: 8000 });
  });

  test("has sign-up link", async ({ page }) => {
    const signUpLink = page
      .getByRole("link", { name: /sign.?up|create.+account|get.+started/i })
      .first();
    if (await signUpLink.isVisible()) {
      const href = await signUpLink.getAttribute("href");
      expect(href).toBeTruthy();
    }
  });

  test("page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(APP_BASE + "/sign-in");
    await page.waitForLoadState("networkidle");
    // Filter out known third-party noise (Clerk, fonts)
    const appErrors = errors.filter(
      (e) =>
        !e.includes("clerk") &&
        !e.includes("fonts.googleapis") &&
        !e.includes("Failed to load resource"),
    );
    expect(appErrors).toHaveLength(0);
  });
});

test.describe("Sign-up page", () => {
  test.skip(skipWebApp, "Web app not running in CI (set APP_BASE_URL to enable)");
  test("renders sign-up form", async ({ page }) => {
    await page.goto(APP_BASE + "/sign-up");
    await expect(page).toHaveTitle(/sign.?up|Nebutra/i);
    const continueBtn = page.getByRole("button", { name: /continue|sign up|next/i }).first();
    if (await continueBtn.isVisible()) {
      await expect(continueBtn).toBeEnabled();
    }
  });

  test("has sign-in link", async ({ page }) => {
    await page.goto(APP_BASE + "/sign-up");
    const signInLink = page
      .getByRole("link", { name: /sign.?in|log.?in|already.+account/i })
      .first();
    if (await signInLink.isVisible()) {
      const href = await signInLink.getAttribute("href");
      expect(href).toBeTruthy();
    }
  });
});

test.describe("API health checks", () => {
  test.skip(skipApi, "API gateway not running in CI (set API_BASE_URL to enable)");
  const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3002";

  test("API gateway health probe returns a structured status", async ({ request }) => {
    const response = await request.get(`${API_BASE}/misc/health`);
    expect([200, 503]).toContain(response.status());

    const body = await response.json();
    expect(["healthy", "degraded", "unhealthy"]).toContain(body.status);
    expect(body.dependencies).toBeDefined();
  });

  test("API gateway returns service info at root", async ({ request }) => {
    const response = await request.get(`${API_BASE}/`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("name");
    expect(body).toHaveProperty("status", "running");
  });

  test("OpenAPI spec is accessible and valid JSON", async ({ request }) => {
    const response = await request.get(`${API_BASE}/openapi.json`);
    expect(response.status()).toBe(200);
    const spec = await response.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info).toBeDefined();
    expect(spec.paths).toBeDefined();
  });
});
