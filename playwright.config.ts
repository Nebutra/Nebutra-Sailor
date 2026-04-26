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
      url: "http://localhost:3002",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: "3002",
        SKIP_ENV_VALIDATION: "true",
        RESEND_API_KEY: "re_placeholder",
        DATABASE_URL: "postgresql://localhost/dev_placeholder",
        CLERK_SECRET_KEY: "sk_test_placeholder",
        BETTER_AUTH_SECRET: "placeholder",
        UPSTASH_REDIS_REST_URL: "https://placeholder.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "placeholder_token",
      },
    },
    {
      command: "pnpm --filter @nebutra/web dev --port 3001",
      url: "http://localhost:3001/demo/embed",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        SKIP_ENV_VALIDATION: "true",
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "placeholder_secret_32_chars_long_xx",
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "sk_test_placeholder",
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost/dev_placeholder",
        UPSTASH_REDIS_REST_URL:
          process.env.UPSTASH_REDIS_REST_URL ?? "https://placeholder.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? "placeholder_token",
      },
    },
    {
      command: "pnpm --filter @nebutra/sleptons dev",
      url: "http://localhost:3003",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        SKIP_ENV_VALIDATION: "true",
      },
    },
  ],
});
