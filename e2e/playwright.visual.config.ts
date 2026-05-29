import { defineConfig, devices } from "@playwright/test";

const repoRoot = process.cwd();

const visualPorts = {
  landing: process.env.VISUAL_LANDING_PORT ?? "3200",
  designDocs: process.env.VISUAL_DESIGN_DOCS_PORT ?? "3203",
};

const landingBaseUrl =
  process.env.VISUAL_LANDING_BASE_URL ?? `http://localhost:${visualPorts.landing}`;
const designDocsBaseUrl =
  process.env.VISUAL_DESIGN_DOCS_BASE_URL ?? `http://localhost:${visualPorts.designDocs}`;
const visualScope = process.env.VISUAL_SCOPE ?? "all";
const visualServerMode =
  process.env.VISUAL_SERVER_MODE ?? (process.env.CI ? "production" : "development");
const shouldUseProductionServer = visualServerMode === "production";
const shouldRunLanding = visualScope === "all" || visualScope === "landing";
const shouldRunDesignDocs = visualScope === "all" || visualScope === "design-docs";

const webServerTimeout = shouldUseProductionServer ? 600_000 : 240_000;
const nextDevWatcherEnv = {
  WATCHPACK_POLLING: "true",
  CHOKIDAR_USEPOLLING: "true",
  PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: "false",
  SKIP_ENV_VALIDATION: "true",
};
const nextServerEnv = {
  ...nextDevWatcherEnv,
  NEXT_TELEMETRY_DISABLED: "1",
};

process.env.VISUAL_LANDING_BASE_URL ??= landingBaseUrl;
process.env.VISUAL_DESIGN_DOCS_BASE_URL ??= designDocsBaseUrl;

export default defineConfig({
  testDir: "./visual",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html"]],
  use: {
    bypassCSP: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-light",
      use: {
        ...devices["Desktop Chrome"],
        colorScheme: "light",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "tablet-light",
      use: { ...devices["iPad Pro 11"], colorScheme: "light" },
    },
    {
      name: "mobile-light",
      use: { ...devices["Pixel 5"], colorScheme: "light" },
    },
    {
      name: "desktop-dark",
      use: {
        ...devices["Desktop Chrome"],
        colorScheme: "dark",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "tablet-dark",
      use: { ...devices["iPad Pro 11"], colorScheme: "dark" },
    },
    {
      name: "mobile-dark",
      use: { ...devices["Pixel 5"], colorScheme: "dark" },
    },
  ],
  webServer: [
    ...(shouldRunLanding
      ? [
          {
            command: shouldUseProductionServer
              ? `rm -rf apps/landing-page/.next && pnpm --config.verify-deps-before-run=false --filter @nebutra/landing-page build && pnpm --dir apps/landing-page exec next start --port ${visualPorts.landing}`
              : `pnpm --config.verify-deps-before-run=false --dir apps/landing-page exec next dev --webpack --port ${visualPorts.landing}`,
            url: `${landingBaseUrl}/api/e2e/health`,
            cwd: repoRoot,
            reuseExistingServer: !process.env.CI,
            timeout: webServerTimeout,
            env: {
              ...nextServerEnv,
              NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3201",
              NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3202",
            },
          },
        ]
      : []),
    ...(shouldRunDesignDocs
      ? [
          {
            command: shouldUseProductionServer
              ? `pnpm --config.verify-deps-before-run=false --filter @nebutra/design-docs clean && pnpm --config.verify-deps-before-run=false --filter @nebutra/design-docs prebuild && cd apps/design-docs && node scripts/ensure-pages-manifest.mjs && _FUMADOCS_MDX=1 pnpm exec next build --webpack && pnpm exec next start --port ${visualPorts.designDocs}`
              : `pnpm --config.verify-deps-before-run=false --filter @nebutra/design-docs prebuild && pnpm --config.verify-deps-before-run=false --filter @nebutra/design-docs exec next dev --port ${visualPorts.designDocs}`,
            url: `${designDocsBaseUrl}/en/docs`,
            cwd: repoRoot,
            reuseExistingServer: !process.env.CI,
            timeout: webServerTimeout,
            env: nextServerEnv,
          },
        ]
      : []),
  ],
});
