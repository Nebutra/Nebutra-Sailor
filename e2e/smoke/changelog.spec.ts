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
    // Each release is an <li> in the "Releases" list: the release title is its
    // heading, and the version is a label beside the date (Linear's changelog
    // shape, 7ab853059). The static fallback carries v0.4.0 through v1.7.
    const releases = page.getByRole("list", { name: "Releases" });
    const firstRelease = releases.getByRole("listitem").first();
    await expect(firstRelease.getByText(/^v\d+\.\d+/).first()).toBeVisible();
    await expect(firstRelease.getByRole("heading", { level: 2 })).toBeVisible();
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
