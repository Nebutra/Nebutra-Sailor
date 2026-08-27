import { expect, test } from "@playwright/test";

test.skip("golden: signup → dashboard → first action", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page.getByRole("heading")).toBeVisible();
});
