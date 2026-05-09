/**
 * Golden Path 5: Legal pages + cookie banner.
 *
 * /legal/privacy-policy and /legal/terms-of-service both load with content,
 * a cookie banner appears on first visit, and Accept All dismisses it
 * persistently (i.e. it should not reappear after reload).
 *
 * Targets the landing-page app — public, no auth required.
 */

import { expect, type Page, test } from "@playwright/test";
import { LANDING_BASE_URL } from "../fixtures/auth";

const LEGAL_ROUTES = [
  { path: "/legal/privacy-policy", heading: /privacy.*policy/i },
  { path: "/legal/terms-of-service", heading: /terms.*service/i },
] as const;

async function clearCookieConsent(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem("cookie-consent");
      window.localStorage.removeItem("nebutra-cookie-consent");
    } catch {
      /* noop — storage may be unavailable in some contexts */
    }
  });
}

test.describe("Legal pages golden path", () => {
  for (const route of LEGAL_ROUTES) {
    test(`${route.path} loads with content and shows cookie banner`, async ({ page }) => {
      await clearCookieConsent(page);
      await page.goto(`${LANDING_BASE_URL}${route.path}`);

      // Content present
      await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
      const bodyText = (await page.locator("main, body").first().textContent()) ?? "";
      expect(bodyText.trim().length).toBeGreaterThan(200);

      // Cookie banner appears
      const banner = page
        .getByRole("dialog", { name: /cookie|consent/i })
        .or(page.getByTestId("cookie-banner"));
      await expect(banner.first()).toBeVisible({ timeout: 10_000 });
    });
  }

  test("Accept All dismisses cookie banner and persists across reload", async ({ page }) => {
    await clearCookieConsent(page);
    await page.goto(`${LANDING_BASE_URL}/legal/privacy-policy`);

    const banner = page
      .getByRole("dialog", { name: /cookie|consent/i })
      .or(page.getByTestId("cookie-banner"));
    await expect(banner.first()).toBeVisible({ timeout: 10_000 });

    await page
      .getByRole("button", { name: /accept all|accept.*cookies/i })
      .first()
      .click();
    await expect(banner.first()).toBeHidden({ timeout: 5_000 });

    // Reload — banner must NOT come back.
    await page.reload();
    await expect(banner.first()).toBeHidden({ timeout: 3_000 });
  });
});
