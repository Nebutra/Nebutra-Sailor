import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
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
      command: "pnpm --filter @nebutra/api-gateway dev",
      url: "http://localhost:3002/api/misc/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: "3002",
        SKIP_ENV_VALIDATION: "true",
      },
    },
    {
      command: "pnpm --filter @nebutra/web dev --port 3001",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        SKIP_ENV_VALIDATION: "true",
      },
    },
  ],
});
