/**
 * Golden Path 5: Legal pages + cookie banner.
 *
 * /privacy and /terms — the canonical legal pages on the landing app — both
 * load with content, a cookie banner appears on first visit, and accepting it
 * dismisses it persistently (i.e. it should not reappear after reload).
 *
 * Targets the landing app — public, no auth required, so this is the one
 * golden spec CI can run without secrets (.github/workflows/golden-e2e.yml).
 *
 * The DB-backed `/legal/<slug>` duplicates are served only when
 * `NEXT_PUBLIC_LEGAL_API_BASE` points at a `/api/legal` route, which no
 * environment provides today (they `notFound()` otherwise), so the spec
 * asserts the canonical routes instead.
 */

import { expect, type Page, test } from "@playwright/test";
import { LANDING_BASE_URL } from "../fixtures/auth";

/** Mirrors CONSENT_STORAGE_KEY in apps/landing/src/lib/consent.ts. */
const CONSENT_STORAGE_KEY = "nebutra_consent_v1";

const LEGAL_ROUTES = [
  { path: "/privacy", title: /privacy/i },
  { path: "/terms", title: /terms/i },
] as const;

async function clearCookieConsent(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.addInitScript((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop — storage may be unavailable in some contexts */
    }
  }, CONSENT_STORAGE_KEY);
}

function cookieBanner(page: Page) {
  return page
    .getByRole("dialog", { name: /cookie|consent/i })
    .or(page.getByTestId("cookie-banner"));
}

test.describe("Legal pages golden path", () => {
  for (const route of LEGAL_ROUTES) {
    test(`${route.path} loads with content and shows cookie banner`, async ({ page }) => {
      await clearCookieConsent(page);
      await page.goto(`${LANDING_BASE_URL}${route.path}`);

      // Content present
      await expect(page).toHaveTitle(route.title);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const bodyText = (await page.locator("main, body").first().textContent()) ?? "";
      expect(bodyText.trim().length).toBeGreaterThan(200);

      // Cookie banner appears
      await expect(cookieBanner(page).first()).toBeVisible({ timeout: 10_000 });
    });
  }

  test("accepting dismisses cookie banner and persists across reload", async ({ page }) => {
    await clearCookieConsent(page);
    await page.goto(`${LANDING_BASE_URL}/privacy`);

    const banner = cookieBanner(page);
    await expect(banner.first()).toBeVisible({ timeout: 10_000 });

    await page
      .getByRole("button", { name: /accept analytics|accept all|accept.*cookies/i })
      .first()
      .click();
    await expect(banner.first()).toBeHidden({ timeout: 5_000 });

    // Reload — banner must NOT come back.
    await page.reload();
    await expect(banner.first()).toBeHidden({ timeout: 3_000 });
  });
});
