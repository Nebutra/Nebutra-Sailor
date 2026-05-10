/**
 * Golden Path 3: API keys — create key → see plaintext once → revoke.
 *
 * The plaintext-once invariant is the load-bearing security guarantee:
 * after the create response is closed, the key value must NOT appear
 * anywhere in the rendered DOM.
 */

import { expect, test } from "@playwright/test";
import { APP_BASE_URL, injectMockSession, isLiveEnv, SAMPLE_USER } from "../fixtures/auth";

test.describe("API keys golden path", () => {
  test.beforeEach(async ({ context }) => {
    test.fixme(!isLiveEnv(), "Requires authenticated session + DB-backed key store");
    await injectMockSession(context, SAMPLE_USER);
  });

  test("creates a key, displays plaintext once, then revokes it", async ({ page }) => {
    await page.goto(`${APP_BASE_URL}/settings/api-keys`);

    // Create
    await page.getByRole("button", { name: /create.*key|new.*key/i }).click();
    await page.getByLabel(/name|label/i).fill("E2E Golden Path Key");
    await page.getByRole("button", { name: /create|generate/i }).click();

    // Plaintext shown once — capture it before the dialog closes.
    const plaintextLocator = page.getByTestId("api-key-plaintext");
    await expect(plaintextLocator).toBeVisible({ timeout: 10_000 });
    const plaintext = (await plaintextLocator.textContent())?.trim() ?? "";
    expect(plaintext).toMatch(/^[a-zA-Z0-9_-]{16,}$/);

    // Acknowledge & close — plaintext must disappear.
    await page.getByRole("button", { name: /done|i.*saved|close/i }).click();
    await expect(page.getByText(plaintext)).toHaveCount(0);

    // Revoke
    const row = page.getByRole("row", { name: /E2E Golden Path Key/ });
    await row.getByRole("button", { name: /revoke|delete/i }).click();
    await page.getByRole("button", { name: /confirm|yes.*revoke/i }).click();

    await expect(page.getByText(/E2E Golden Path Key/)).toHaveCount(0);
  });
});
