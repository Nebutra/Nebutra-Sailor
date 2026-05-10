import { defineConfig, devices } from "@playwright/test";

/**
 * Minimal Playwright config for Sleptons community E2E tests.
 * Only starts the two servers needed: landing-page + community.
 *
 * Sister configs in this directory: playwright.config.ts (smoke, all 4
 * servers) and playwright.golden.config.ts (post-deploy, no webServer).
 */
export default defineConfig({
  testDir: "./sleptons",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["blob"], ["html", { open: "never" }]] : [["html"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @nebutra/landing-page dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @nebutra/sleptons dev",
      url: "http://localhost:3003",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
