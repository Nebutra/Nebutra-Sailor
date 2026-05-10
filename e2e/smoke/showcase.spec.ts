import { expect, test } from "@playwright/test";

test.describe("Showcase Page", () => {
  test("loads and shows heading", async ({ page }) => {
    await page.goto("/showcase");
    await expect(page).toHaveTitle(/Showcase/i);
    const heading = page.getByRole("heading", { level: 1, name: /showcase/i });
    await expect(heading).toBeVisible();
  });

  test("shows coming soon or project cards", async ({ page }) => {
    await page.goto("/showcase");
    // Either shows "Coming soon" placeholder or project cards
    const comingSoon = page.getByText(/coming soon/i);
    const projectCard = page.locator("a[href^='http']").first();
    const hasContent = (await comingSoon.isVisible()) || (await projectCard.isVisible());
    expect(hasContent).toBe(true);
  });

  test("has description text", async ({ page }) => {
    await page.goto("/showcase");
    await expect(page.getByText(/developers and teams/i)).toBeVisible();
  });
});
