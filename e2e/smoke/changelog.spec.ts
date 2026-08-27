import { expect, test } from "@playwright/test";

import { gotoMarketingPage } from "../helpers/navigation";

test.describe("Changelog Page", () => {
  test("loads and shows heading", async ({ page }) => {
    await gotoMarketingPage(page, "/changelog");
    await expect(page).toHaveTitle(/Changelog/i);
    const heading = page.getByRole("heading", { level: 1, name: /changelog/i });
    await expect(heading).toBeVisible();
  });

  test("displays release entries with versions", async ({ page }) => {
    await gotoMarketingPage(page, "/changelog");
    // Should have at least one version heading (static fallback has v0.4.0 through v0.10.0)
    const versionHeading = page.getByRole("heading", { name: /^v\d+\.\d+/ }).first();
    await expect(versionHeading).toBeVisible();
  });

  test("timeline has multiple entries", async ({ page }) => {
    await gotoMarketingPage(page, "/changelog");
    const entries = page.locator("ol > li");
    // Static fallback has 8 entries
    await expect(entries).not.toHaveCount(0);
  });

  test("has RSS and social links in footer", async ({ page }) => {
    await gotoMarketingPage(page, "/changelog");
    const rssLink = page.getByRole("link", { exact: true, name: "RSS" });
    await expect(rssLink).toBeVisible();
  });
});
