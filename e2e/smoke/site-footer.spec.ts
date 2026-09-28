import { expect, test } from "@playwright/test";

import { gotoMarketingPage } from "../helpers/navigation";

/**
 * The footer the landing build actually serves. Which one that is depends on
 * the site (SiteShell): the Nebutra site's rail footer, or the template's
 * FooterMinimal. Both carry data-testid="site-footer" and this contract; what
 * only FooterMinimal has (newsletter, social icons, status) is its component
 * test, components/landing/__tests__/footer-minimal.test.tsx.
 *
 * This suite used to target FooterMinimal on "/", which the Nebutra site stopped
 * rendering when the rail shipped — every case timed out finding a footer that
 * was no longer there.
 */
test.describe("Site footer", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await gotoMarketingPage(page, "/");
    const footer = page.getByTestId("site-footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
  });

  test("is a semantic <footer> with the brand mark", async ({ page }) => {
    const footer = page.getByTestId("site-footer");
    expect(await footer.evaluate((el) => el.tagName.toLowerCase())).toBe("footer");
    await expect(footer.locator("svg, img").first()).toBeVisible();
  });

  test("has a Footer navigation landmark with the legal pages", async ({ page }) => {
    const nav = page.getByTestId("site-footer").locator('nav[aria-label="Footer"]');
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: /privacy/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /terms/i })).toBeVisible();
  });

  test("external links open in a new tab without leaking the opener", async ({ page }) => {
    const external = page.getByTestId("site-footer").locator('a[href^="https://"]');
    const count = await external.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const link = external.nth(i);
      const href = await link.getAttribute("href");
      expect(await link.getAttribute("target"), `${href} target`).toBe("_blank");
      expect(await link.getAttribute("rel"), `${href} rel`).toContain("noopener");
      expect(await link.getAttribute("rel"), `${href} rel`).toContain("noreferrer");
    }
  });

  test("states the copyright year", async ({ page }) => {
    await expect(page.getByTestId("site-footer").getByText(/© 20\d\d/)).toBeVisible();
  });

  test("opens without a saturated separator", async ({ page }) => {
    // The footer once opened with a 1px --brand-gradient rule — full-saturation
    // blue-9 across the page. Separation comes from whitespace and a border.
    await expect(page.getByTestId("footer-gradient-line")).toHaveCount(0);
  });

  test("keeps its navigation on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoMarketingPage(page, "/");
    const footer = page.getByTestId("site-footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.locator('nav[aria-label="Footer"]')).toBeVisible();
  });

  test("every link is keyboard focusable", async ({ page }) => {
    const links = page.getByTestId("site-footer").getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await links.nth(i).focus();
      await expect(links.nth(i)).toBeFocused();
    }
  });
});
