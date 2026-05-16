import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke suite — CI default. Spawns 4 dev servers and runs e2e/smoke/*.spec.ts.
 * Sister configs in this directory: playwright.golden.config.ts (post-deploy
 * verification, no webServer) and playwright.sleptons.config.ts (sleptons-only).
 */
const e2ePorts = {
  landing: process.env.E2E_LANDING_PORT ?? "3100",
  web: process.env.E2E_WEB_PORT ?? "3101",
  api: process.env.E2E_API_PORT ?? "3102",
  sleptons: process.env.E2E_SLEPTONS_PORT ?? "3103",
};

const landingBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${e2ePorts.landing}`;
const appBaseUrl = process.env.APP_BASE_URL ?? `http://127.0.0.1:${e2ePorts.web}`;
const apiBaseUrl = process.env.API_BASE_URL ?? `http://127.0.0.1:${e2ePorts.api}`;
const sleptonsBaseUrl = process.env.SLEPTONS_BASE_URL ?? `http://127.0.0.1:${e2ePorts.sleptons}`;
const corsOrigins = [landingBaseUrl, appBaseUrl, sleptonsBaseUrl].join(",");
const e2eHealthPath = "/api/e2e/health";

process.env.PLAYWRIGHT_BASE_URL ??= landingBaseUrl;
process.env.APP_BASE_URL ??= appBaseUrl;
process.env.API_BASE_URL ??= apiBaseUrl;
process.env.E2E_AUTH_SMOKE ??= "0";

export default defineConfig({
  testDir: "./smoke",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["blob"], ["html", { open: "never" }]] : [["html"]],
  use: {
    baseURL: landingBaseUrl,
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
      command: `pnpm --filter @nebutra/landing-page exec next dev --webpack --port ${e2ePorts.landing}`,
      url: `${landingBaseUrl}${e2eHealthPath}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        SKIP_ENV_VALIDATION: "true",
        NEXT_PUBLIC_APP_URL: appBaseUrl,
        NEXT_PUBLIC_API_URL: apiBaseUrl,
      },
    },
    {
      command: "pnpm --filter @nebutra/gateway dev",
      url: apiBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: e2ePorts.api,
        CORS_ORIGINS: corsOrigins,
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
      command: `pnpm --filter @nebutra/web exec next dev --webpack --port ${e2ePorts.web}`,
      url: `${appBaseUrl}${e2eHealthPath}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        SKIP_ENV_VALIDATION: "true",
        AUTH_PROVIDER: process.env.AUTH_PROVIDER ?? "clerk",
        NEXT_PUBLIC_AUTH_PROVIDER: process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "clerk",
        NEXT_PUBLIC_SITE_URL: landingBaseUrl,
        NEXT_PUBLIC_APP_URL: appBaseUrl,
        NEXT_PUBLIC_API_URL: apiBaseUrl,
        NEXT_PUBLIC_API_GATEWAY_URL: apiBaseUrl,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "placeholder_secret_32_chars_long_xx",
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "sk_test_placeholder",
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost/dev_placeholder",
        UPSTASH_REDIS_REST_URL:
          process.env.UPSTASH_REDIS_REST_URL ?? "https://placeholder.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? "placeholder_token",
      },
    },
    {
      command: `pnpm --filter @nebutra/sleptons exec next dev --webpack --port ${e2ePorts.sleptons}`,
      url: `${sleptonsBaseUrl}${e2eHealthPath}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        SKIP_ENV_VALIDATION: "true",
        NEXT_PUBLIC_SITE_URL: landingBaseUrl,
        NEXT_PUBLIC_APP_URL: appBaseUrl,
      },
    },
  ],
});
