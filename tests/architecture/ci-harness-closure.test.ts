import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

describe("ci harness dependency closure", () => {
  it("builds app dependency closures before standalone app builds", async () => {
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");

    expect(workflow).toContain('pnpm turbo build --filter="@nebutra/landing-page^..."');
    expect(workflow).toContain('pnpm turbo build --filter="@nebutra/web^..."');
    expect(workflow).toContain('pnpm turbo build --filter="@nebutra/gateway^..."');
  });

  it("keeps the core affected build focused on runtime-critical surfaces", async () => {
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    const turboBaseRef = "$" + "{TURBO_BASE_REF}";

    expect(workflow).toContain(
      `run: |\n          pnpm turbo build --filter="...[${turboBaseRef}]..."`,
    );
    // Path-glob filters (tolerate stripped apps in the template build).
    expect(workflow).toContain("--filter='!./apps/design-docs'");
    expect(workflow).toContain("--filter='!./apps/sailor-docs'");
    expect(workflow).toContain("--filter='!./apps/storybook'");
    expect(workflow).toContain("--filter='!./apps/studio'");
    expect(workflow).toContain("--filter='!./apps/tsekaluk-dev'");
  });

  it("runs bundle analysis through the webpack analyzer path", async () => {
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    const webPackage = JSON.parse(
      await readFile(join(process.cwd(), "apps/web/package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(workflow).toContain("pnpm --filter @nebutra/web analyze");
    expect(webPackage.scripts?.analyze).toContain("next build --webpack");
  });

  it("grants bundle analysis the minimum permission needed to comment on PRs", async () => {
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");

    expect(workflow).toContain(
      [
        "  bundle-analysis:",
        "    name: Web Bundle Analysis",
        "    runs-on: ubuntu-latest",
        "    timeout-minutes: 20",
        "    needs: [detect-changes, build]",
        "    permissions:",
        "      contents: read",
        "      issues: write",
        "      pull-requests: write",
      ].join("\n"),
    );
  });

  it("waits for a bounded web health route in Playwright webServer readiness checks", async () => {
    const playwrightConfig = await readFile(
      join(process.cwd(), "e2e/playwright.config.ts"),
      "utf8",
    );

    expect(playwrightConfig).toContain("appBaseUrl");
    expect(playwrightConfig).toContain("/api/e2e/health");
  });

  it("declares dynamic workspace imports as package dependencies", async () => {
    const apiGatewayPackage = JSON.parse(
      await readFile(join(process.cwd(), "backends/gateway/package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };

    expect(apiGatewayPackage.dependencies?.["@nebutra/analytics"]).toBe("workspace:*");
  });

  it("preflights the local E2E runtime before Playwright starts dev servers", async () => {
    const rootPackage = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    const e2ePreflight = await readFile(
      join(process.cwd(), "scripts/check-e2e-prereqs.mjs"),
      "utf8",
    );

    expect(rootPackage.scripts?.["check:e2e-env"]).toBe("node scripts/check-e2e-prereqs.mjs");
    expect(workflow).toContain("pnpm check:e2e-env");
    expect(workflow.indexOf("pnpm check:e2e-env")).toBeLessThan(
      workflow.indexOf("pnpm exec playwright test --config=e2e/playwright.config.ts"),
    );
    expect(e2ePreflight).toContain("loadBindings");
    expect(e2ePreflight).toContain("NEXT_PUBLIC_AUTH_PROVIDER");
    expect(e2ePreflight).toContain("SWC");
  });

  it("has a repeatable web release verification harness with warning governance", async () => {
    const rootPackage = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    const releaseHarness = await readFile(
      join(process.cwd(), "scripts/verify-web-release.mjs"),
      "utf8",
    );

    expect(rootPackage.scripts?.["verify:web-release"]).toBe("node scripts/verify-web-release.mjs");
    expect(releaseHarness).toContain("AUTH_PROVIDER");
    expect(releaseHarness).toContain("NEXT_PUBLIC_AUTH_PROVIDER");
    expect(releaseHarness).toContain("next build --webpack");
    expect(releaseHarness).toContain("classifyBuildWarnings");
    expect(releaseHarness).toContain("knownWarnings");
    expect(workflow).toContain("web-release-verification:");
    expect(workflow).toContain("pnpm verify:web-release");
  });

  it("classifies known web release dependency warnings without suppressing new ones", async () => {
    const { classifyBuildWarnings, knownWarnings } = await import(
      pathToFileURL(join(process.cwd(), "scripts/lib/web-release-warnings.mjs")).href
    );

    const knownLog = [
      "./node_modules/@lobehub/ui/dist/Mermaid.js",
      "Critical dependency: the request of a dependency is an expression",
      "Import trace for requested module:",
      "vscode-languageserver-types",
    ].join("\n");
    const unknownLog = [
      "./packages/new-runtime/src/index.ts",
      "Critical dependency: the request of a dependency is an expression",
      "Import trace for requested module:",
      "@nebutra/new-runtime",
    ].join("\n");

    expect(knownWarnings.map((warning) => warning.id)).toContain(
      "lobe-mermaid-vscode-languageserver",
    );
    expect(classifyBuildWarnings(knownLog).known).toHaveLength(1);
    expect(classifyBuildWarnings(knownLog).unknown).toHaveLength(0);
    expect(classifyBuildWarnings(unknownLog).known).toHaveLength(0);
    expect(classifyBuildWarnings(unknownLog).unknown).toHaveLength(1);
  });

  it("keeps cache Bloom filter imports compatible with CommonJS bloom-filters", async () => {
    const bloomStrategy = await readFile(
      join(process.cwd(), "packages/integrations/cache/src/strategies/bloom.ts"),
      "utf8",
    );

    expect(bloomStrategy).toContain('import bloomFilters from "bloom-filters"');
    expect(bloomStrategy).not.toContain('import { BloomFilter } from "bloom-filters"');
  });

  it("runs Playwright smoke servers on dedicated E2E ports with matching env", async () => {
    const playwrightConfig = await readFile(
      join(process.cwd(), "e2e/playwright.config.ts"),
      "utf8",
    );
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");

    expect(playwrightConfig).toContain("E2E_LANDING_PORT");
    expect(playwrightConfig).toContain("3100");
    expect(playwrightConfig).toContain("CORS_ORIGINS");
    expect(playwrightConfig).toContain("next dev --webpack");
    expect(playwrightConfig).toContain('WATCHPACK_POLLING: "true"');
    expect(playwrightConfig).toContain('CHOKIDAR_USEPOLLING: "true"');
    expect(playwrightConfig).toContain("timeout: 60_000");
    expect(playwrightConfig).toContain("workers: 1");
    expect(workflow).toContain('PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3100"');
    expect(workflow).toContain('APP_BASE_URL: "http://127.0.0.1:3101"');
    expect(workflow).toContain('API_BASE_URL: "http://127.0.0.1:3102"');
  });

  it("uses bounded E2E health endpoints for Next.js webServer readiness", async () => {
    const playwrightConfig = await readFile(
      join(process.cwd(), "e2e/playwright.config.ts"),
      "utf8",
    );

    expect(playwrightConfig).toContain("/api/e2e/health");
    await Promise.all(
      [
        "apps/landing-page/src/app/api/e2e/health/route.ts",
        "apps/web/src/app/api/e2e/health/route.ts",
        "apps/sleptons/src/app/api/e2e/health/route.ts",
      ].map((file) => readFile(join(process.cwd(), file), "utf8")),
    );
  });

  it("keeps auth UI smoke behind an explicit real-provider opt-in", async () => {
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    const playwrightConfig = await readFile(
      join(process.cwd(), "e2e/playwright.config.ts"),
      "utf8",
    );
    const authSpec = await readFile(join(process.cwd(), "e2e/smoke/auth.spec.ts"), "utf8");
    const dashboardSpec = await readFile(
      join(process.cwd(), "e2e/smoke/dashboard.spec.ts"),
      "utf8",
    );

    expect(workflow).toContain('E2E_AUTH_SMOKE: "0"');
    expect(playwrightConfig).toContain('process.env.E2E_AUTH_SMOKE ??= "0"');
    expect(authSpec).toContain('process.env.E2E_AUTH_SMOKE === "1"');
    expect(dashboardSpec).toContain('process.env.E2E_AUTH_SMOKE === "1"');
    expect(authSpec).toContain("test.describe.skip");
    expect(dashboardSpec).toContain("test.describe.skip");
  });

  it("keeps marketing smoke navigation on bounded domcontentloaded waits", async () => {
    const helper = await readFile(join(process.cwd(), "e2e/helpers/navigation.ts"), "utf8");
    const globalSetup = await readFile(join(process.cwd(), "e2e/global-setup.ts"), "utf8");
    const changelogSpec = await readFile(
      join(process.cwd(), "e2e/smoke/changelog.spec.ts"),
      "utf8",
    );
    const footerSpec = await readFile(join(process.cwd(), "e2e/smoke/footer.spec.ts"), "utf8");
    const playwrightConfig = await readFile(
      join(process.cwd(), "e2e/playwright.config.ts"),
      "utf8",
    );

    expect(playwrightConfig).toContain('globalSetup: "./global-setup.ts"');
    expect(globalSetup).toContain('"/changelog"');
    expect(globalSetup).toContain("ROUTE_PREWARM_TIMEOUT_MS");
    expect(helper).toContain('waitUntil: "domcontentloaded"');
    expect(helper).toContain("NAVIGATION_RETRIES");
    expect(helper).toContain("page.request.get");
    expect(helper).toContain("page.goto: Timeout");
    expect(helper).toContain("net::ERR_ABORTED");
    expect(changelogSpec).toContain("gotoMarketingPage");
    expect(footerSpec).toContain("gotoMarketingPage");
  });

  it("backs footer design smoke assertions with a real component marker", async () => {
    const footer = await readFile(
      join(process.cwd(), "apps/landing-page/src/components/landing/FooterMinimal.tsx"),
      "utf8",
    );

    expect(footer).toContain('data-testid="footer-gradient-line"');
    expect(footer).toContain("var(--brand-gradient)");
  });
});
