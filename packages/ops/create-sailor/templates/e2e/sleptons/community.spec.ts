import { expect, test } from "@playwright/test";

test.skip("sleptons: community feed renders", async ({ page }) => {
  await page.goto("/sleptons");
  await expect(page).toHaveURL(/sleptons/);
});
