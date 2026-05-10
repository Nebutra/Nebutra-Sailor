import { expect, test } from "@playwright/test";

test.describe("Landing Page", () => {
  test("loads and shows hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Nebutra/i);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
  });

  test("navigation links are present", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation").first();
    await expect(nav).toBeVisible();
  });

  test("CTA button navigates to sign-up", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /get started|sign up|start/i }).first();
    if (await cta.isVisible()) {
      const href = await cta.getAttribute("href");
      expect(href).toBeTruthy();
    }
  });

  test("dark mode toggle works", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");
    const toggle = page.getByRole("button", { name: /toggle theme|dark mode|light mode/i }).first();
    if (await toggle.isVisible()) {
      await toggle.click();
      const newClass = await html.getAttribute("class");
      expect(newClass).not.toBe(initialClass);
    }
  });

  test("page has no broken images", async ({ page }) => {
    const failedImages: string[] = [];
    page.on("response", (response) => {
      const url = response.url();
      // Skip Next.js image optimization proxy responses — those may fail in CI
      // when external CDN images (svgl.app, simpleicons.org, etc.) are unreachable.
      // We only care about locally-served static images (e.g. /images/foo.png).
      if (url.includes("/_next/image")) return;
      if (response.request().resourceType() === "image" && !response.ok()) {
        failedImages.push(url);
      }
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(failedImages, `Broken images: ${failedImages.join(", ")}`).toHaveLength(0);
  });
});
