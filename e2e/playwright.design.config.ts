import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const repoRoot = path.resolve(__dirname, "..");
const baseURL = "http://127.0.0.1:3119";

export default defineConfig({
  testDir: "./design",
  outputDir: "../test-results/design",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [
    process.env.CI ? ["github"] : ["list"],
    ["html", { outputFolder: path.resolve(repoRoot, "playwright-report/design"), open: "never" }],
  ],
  use: {
    baseURL,
    channel: process.env.DESIGN_BROWSER_CHANNEL,
    launchOptions: process.env.DESIGN_BROWSER_EXECUTABLE
      ? { executablePath: process.env.DESIGN_BROWSER_EXECUTABLE }
      : undefined,
    colorScheme: "light",
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: "pnpm --filter @nebutra/design exec next start --port 3119",
    cwd: repoRoot,
    url: `${baseURL}/components/button`,
    reuseExistingServer: !process.env.CI && process.env.DESIGN_REUSE_SERVER === "1",
    timeout: 120_000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
