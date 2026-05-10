import { expect, test } from "@playwright/test";

// /sign-in and /sign-up live on the web app (port 3001), not the landing page.
// In CI the web app is not started unless APP_BASE_URL is explicitly provided.
const APP_BASE = process.env.APP_BASE_URL ?? "http://localhost:3001";
const skipWebApp = process.env.CI === "true" && !process.env.APP_BASE_URL;

test.describe("Authentication Flow", () => {
  test.skip(skipWebApp, "Web app not running in CI (set APP_BASE_URL to enable)");

  test("sign-in page is accessible", async ({ page }) => {
    await page.goto(APP_BASE + "/sign-in");
    await expect(page).not.toHaveTitle(/404|Not Found/i);
  });

  test("sign-up page is accessible", async ({ page }) => {
    await page.goto(APP_BASE + "/sign-up");
    await expect(page).not.toHaveTitle(/404|Not Found/i);
  });

  test("sign-in link from landing page navigates correctly", async ({ page }) => {
    await page.goto("/");
    const signInLink = page.getByRole("link", { name: /sign in|log in/i }).first();
    if (await signInLink.isVisible()) {
      await signInLink.click();
      await expect(page).not.toHaveTitle(/Error|404/i);
    }
  });
});
