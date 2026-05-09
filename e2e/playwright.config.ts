/**
 * Playwright config for the **golden-path** suite under `e2e/tests/`.
 *
 * The repo also has a root `playwright.config.ts` that runs the legacy
 * `e2e/*.spec.ts` smoke tests with a managed `webServer`. This config is
 * intentionally lighter — it does NOT spawn a dev server. Run it with the
 * web app + landing page already up (or set `APP_BASE_URL` /
 * `LANDING_BASE_URL` to a deployed environment).
 *
 *   pnpm exec playwright test --config=e2e/playwright.config.ts --list
 *   APP_BASE_URL=http://localhost:3000 pnpm exec playwright test --config=e2e/playwright.config.ts
 *
 * To activate non-fixme'd assertions (i.e. run the tests for real):
 *   E2E_LIVE=1 APP_BASE_URL=... LANDING_BASE_URL=... pnpm exec playwright test --config=e2e/playwright.config.ts
 */

import { defineConfig, devices } from "@playwright/test";

const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "./test-results",
  use: {
    baseURL: APP_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Opt-in: uncomment for cross-browser coverage.
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
