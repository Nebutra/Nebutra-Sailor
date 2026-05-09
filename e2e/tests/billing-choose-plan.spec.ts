/**
 * Golden Path 4: Billing checkout — /choose-plan → POST /api/billing/checkout
 * → return to /checkout-return → polling resolves.
 *
 * Uses Playwright route mocking to stub the checkout endpoint, so this spec
 * can run against a dev build without a real Stripe account. The integrator
 * still needs a running web app to render the pages.
 */

import { expect, test } from "@playwright/test";
import { APP_BASE_URL, injectMockSession, isLiveEnv, SAMPLE_USER } from "../fixtures/auth";

const MOCK_CHECKOUT_URL = "https://checkout.stripe.test/session/cs_test_e2e_golden";

test.describe("Billing choose-plan golden path", () => {
  test.beforeEach(async ({ context, page }) => {
    test.fixme(!isLiveEnv(), "Requires running web app to render /choose-plan");
    await injectMockSession(context, SAMPLE_USER);

    await page.route("**/api/billing/checkout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { url: MOCK_CHECKOUT_URL, sessionId: "cs_test_e2e_golden" },
        }),
      });
    });

    await page.route("**/api/billing/active-plan", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { plan: "pro", status: "active", since: new Date().toISOString() },
        }),
      });
    });
  });

  test("Pro plan click triggers checkout request and resolves on return", async ({ page }) => {
    await page.goto(`${APP_BASE_URL}/choose-plan`);
    await expect(page.getByRole("heading", { name: /choose.*plan|pricing/i })).toBeVisible();

    // Capture the checkout POST so we can assert on the request body.
    const checkoutRequest = page.waitForRequest(
      (req) => req.url().includes("/api/billing/checkout") && req.method() === "POST",
    );

    await page
      .getByRole("button", { name: /pro|upgrade.*pro|select.*pro/i })
      .first()
      .click();
    const req = await checkoutRequest;
    const body = req.postDataJSON() as { plan?: string };
    expect(body.plan?.toLowerCase()).toContain("pro");

    // Simulate the redirect back from Stripe — visit the return URL directly.
    await page.goto(`${APP_BASE_URL}/checkout-return?session_id=cs_test_e2e_golden`);

    // Polling UI should resolve to "active" via the mocked active-plan route.
    await expect(page.getByText(/plan.*active|subscription.*active|welcome.*pro/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
