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

/**
 * `page.addInitScript` re-runs on every future navigation in this page,
 * including reloads the test itself triggers later (the accept button's own
 * `window.location.reload()`, and the explicit `page.reload()` below). Left
 * unguarded, it wipes the consent choice right back out on each of those
 * reloads, which makes "persists across reload" fail unconditionally
 * regardless of product behavior. Gate it on a sessionStorage flag — that
 * storage survives reloads of the same tab (unlike a fresh navigation to a
 * new context) — so the clear only happens once, before the test's first
 * navigation.
 */
async function clearCookieConsent(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.addInitScript((key) => {
    try {
      const initFlag = "__e2e_consent_init_done__";
      if (window.sessionStorage.getItem(initFlag)) return;
      window.localStorage.removeItem(key);
      window.sessionStorage.setItem(initFlag, "1");
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
