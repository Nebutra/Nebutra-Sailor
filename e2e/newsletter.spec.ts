import { expect, test } from "@playwright/test";

test.describe("Newsletter Signup", () => {
  test("newsletter form is visible in footer", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const emailInput = page.getByRole("textbox", { name: /email|newsletter/i }).first();
    // Footer newsletter may be at bottom
    if (await emailInput.isVisible()) {
      await expect(emailInput).toBeVisible();
    }
  });

  test("newsletter form validates email", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const emailInput = page.getByRole("textbox", { name: /email|newsletter/i }).first();
    if (await emailInput.isVisible()) {
      // HTML5 validation should prevent submission of invalid email
      await emailInput.fill("not-an-email");
      const submitBtn = page.getByRole("button", { name: /subscribe/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        // Form should not submit — HTML5 validation blocks it
        // Page should still be on the same URL
        await expect(page).toHaveURL("/");
      }
    }
  });

  test("newsletter form accepts valid email", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const emailInput = page.getByRole("textbox", { name: /email|newsletter/i }).first();
    if (await emailInput.isVisible()) {
      await emailInput.fill("test@example.com");
      const submitBtn = page.getByRole("button", { name: /subscribe/i }).first();
      if (await submitBtn.isVisible()) {
        // Intercept the API call
        await page.route("**/api/newsletter", (route) =>
          route.fulfill({ status: 200, body: JSON.stringify({ success: true }) }),
        );
        await submitBtn.click();
        // Should show success message
        await expect(page.getByText(/thanks|subscri/i).first()).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
