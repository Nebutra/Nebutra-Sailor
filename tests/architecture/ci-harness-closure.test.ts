import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const rawNodeSetupActionPattern = /^\s*uses:\s*actions\/setup-node@/m;
const rawPnpmSetupActionPattern = /^\s*uses:\s*pnpm\/action-setup@/m;
const rawFrozenInstallPattern = /^\s*run:\s*pnpm install --frozen-lockfile\b/m;

describe("ci harness dependency closure", () => {
  it("keeps low-risk tooling workflows on the shared Node/pnpm setup action", async () => {
    const setupAction = await readFile(
      join(process.cwd(), ".github/actions/setup-node-pnpm/action.yml"),
      "utf8",
    );
    const migratedWorkflows = [
      ".github/workflows/chromatic.yml",
      ".github/workflows/ci.yml",
      ".github/workflows/codeql.yml",
      ".github/workflows/dead-code.yml",
      ".github/workflows/deploy-gateway.yml",
      ".github/workflows/design-sync.yml",
      ".github/workflows/release.yml",
      ".github/workflows/security-scan.yml",
      ".github/workflows/sync-template.yml",
      ".github/workflows/ui-governance.yml",
      ".github/workflows/visual-acceptance.yml",
    ];
    const registryUrlInput = "registry-url: $" + "{{ inputs.registry-url }}";
    const scopeInput = "scope: $" + "{{ inputs.scope }}";

    expect(setupAction).toContain("pnpm/action-setup@b906affcce14559ad1aafd4ab0e942779e9f58b1");
    expect(setupAction).toContain("actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e");
    expect(setupAction).toContain("pnpm install --frozen-lockfile");
    expect(setupAction).toContain(registryUrlInput);
    expect(setupAction).toContain(scopeInput);

    for (const workflowPath of migratedWorkflows) {
      const workflow = await readFile(join(process.cwd(), workflowPath), "utf8");
      expect(workflow).toContain("uses: ./.github/actions/setup-node-pnpm");
      expect(workflow).not.toMatch(rawPnpmSetupActionPattern);
      expect(workflow).not.toMatch(rawNodeSetupActionPattern);
      expect(workflow).not.toMatch(rawFrozenInstallPattern);
    }
  });

  it("keeps pure Node workflows on the shared Node setup action", async () => {
    const setupAction = await readFile(
      join(process.cwd(), ".github/actions/setup-node/action.yml"),
      "utf8",
    );
    // Pure Node only. sync-subrepo-mirrors runs `pnpm turbo run build`, so it
    // needs the pnpm composite and is no longer a member of this set — it did
    // not regress, it outgrew the classification, and asserting otherwise
    // demanded a setup that would not have installed what the job runs.
    const migratedWorkflows = [".github/workflows/package-registry-governance.yml"];
    const nodeVersionInput = "node-version: $" + "{{ inputs.node-version }}";

    expect(setupAction).toContain("actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e");
    expect(setupAction).toContain(nodeVersionInput);
    expect(setupAction).not.toMatch(rawPnpmSetupActionPattern);
    expect(setupAction).not.toMatch(rawFrozenInstallPattern);

    for (const workflowPath of migratedWorkflows) {
      const workflow = await readFile(join(process.cwd(), workflowPath), "utf8");
      expect(workflow).toMatch(/^\s+uses: \.\/\.github\/actions\/setup-node$/m);
      expect(workflow).not.toMatch(rawNodeSetupActionPattern);
      expect(workflow).not.toMatch(rawPnpmSetupActionPattern);
      expect(workflow).not.toMatch(rawFrozenInstallPattern);
    }
  });

  it("keeps workflow setup calls routed through shared actions", async () => {
    const workflowDir = join(process.cwd(), ".github/workflows");
    const workflowFiles = (await readdir(workflowDir))
      .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
      .sort();

    expect(workflowFiles.length).toBeGreaterThan(0);

    for (const workflowFile of workflowFiles) {
      const workflow = await readFile(join(workflowDir, workflowFile), "utf8");
      expect(workflow).not.toMatch(rawNodeSetupActionPattern);
      expect(workflow).not.toMatch(rawPnpmSetupActionPattern);
      expect(workflow).not.toMatch(rawFrozenInstallPattern);
    }
  });

  it("keeps visual acceptance scoped and parallelizable", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github/workflows/visual-acceptance.yml"),
      "utf8",
    );

    expect(workflow).not.toContain(".github/actions/setup-node-pnpm/action.yml");
    expect(workflow).toContain("uses: dorny/paths-filter@d1c1ffe0248fe513906c8e24db8ea791d46f8590");
    expect(workflow).toContain("visual-landing:");
    expect(workflow).toContain("if: needs.detect-changes.outputs.landing == 'true'");
    expect(workflow).toContain("pnpm visual:landing:ci");
    expect(workflow).toContain('e2e/visual/helpers/**"');
    expect(workflow).toContain("name: Docs and Feature Showcase");
  });

  it("keeps the Cloud VM fallback on the shared setup action without redundant smoke URLs", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github/workflows/deploy-ecs.yml"),
      "utf8",
    );
    const nodeVersionInput = "node-version: $" + "{{ env.NODE_VERSION }}";

    expect(workflow).toContain("uses: ./.github/actions/setup-node-pnpm");
    expect(workflow).toContain(nodeVersionInput);
    expect(workflow).not.toMatch(rawPnpmSetupActionPattern);
    expect(workflow).not.toMatch(rawNodeSetupActionPattern);
    expect(workflow).not.toMatch(rawFrozenInstallPattern);
    expect(workflow).not.toContain("https://nebutra.com/refer?code=smoke");
  });

  it("builds app dependency closures before standalone app builds", async () => {
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");

    expect(workflow).toContain('pnpm turbo build --filter="@nebutra/landing^..."');
    expect(workflow).toContain('pnpm turbo build --filter="@nebutra/web^..."');
    expect(workflow).toContain('pnpm turbo build --filter="@nebutra/gateway^..."');
  });

  it("keeps the core affected build focused on runtime-critical surfaces", async () => {
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    const turboBaseRef = "$" + "{TURBO_BASE_REF}";

    expect(workflow).toContain(`filters=(--filter="...[${turboBaseRef}]...")`);
    // Path-glob filters (tolerate stripped apps in the template build).
    expect(workflow).toContain("apps/sailor-docs apps/storybook apps/studio");
    expect(workflow).toContain('filters+=(--filter="!./$app")');
    expect(workflow).toContain(`pnpm turbo build "\${filters[@]}"`);
  });

  it("backs database migration checks with a local Postgres shadow service", async () => {
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    const shadowDatabaseUrl =
      "$" +
      "{{ secrets.SHADOW_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shadow_nebutra' }}";

    expect(workflow).toContain("  db-check:");
    expect(workflow).toContain("    services:");
    expect(workflow).toContain("      postgres:");
    expect(workflow).toContain("        image: postgres:16");
    expect(workflow).toContain("          POSTGRES_DB: shadow_nebutra");
    expect(workflow).toContain('          --health-cmd "pg_isready -U postgres -d shadow_nebutra"');
    expect(workflow).toContain(`--shadow-database-url "${shadowDatabaseUrl}"`);
  });

  it("keeps UI governance scoped to design and policy paths", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github/workflows/ui-governance.yml"),
      "utf8",
    );
    const governedPaths = [
      ".github/actions/setup-node-pnpm/action.yml",
      ".github/workflows/ui-governance.yml",
      "apps/design/src/**",
      "apps/landing/src/**",
      "apps/web/src/**",
      "packages/design/**",
      "scripts/lib/ui-governance-policy.ts",
      "scripts/verify-brand-token-sync.ts",
      "scripts/verify-ui-governance.ts",
      "tests/architecture/governance/**",
    ];

    expect(workflow).toContain("  pull_request:\n    branches: [main]\n    paths:");
    expect(workflow).toContain("  push:\n    branches: [main]\n    paths:");
    for (const governedPath of governedPaths) {
      expect(workflow).toContain(`      - "${governedPath}"`);
    }
    expect(workflow).not.toContain('      - "**"');
  });

  it("keeps scheduled load testing on smoke by default", async () => {
    const workflow = await readFile(join(process.cwd(), ".github/workflows/load-test.yml"), "utf8");
    const scenarioInput = "$" + "{{ inputs.scenario || 'smoke' }}";

    expect(workflow).toContain("Run a weekly smoke check");
    expect(workflow).toContain('default: "smoke"');
    expect(workflow).toContain(`name: k6 Load Test (${scenarioInput})`);
    expect(workflow).toContain(`LOAD_TEST_SCENARIO: ${scenarioInput}`);
    expect(workflow).toContain(`name: k6-results-${scenarioInput}`);
    expect(workflow).not.toMatch(/default:\s*"ramp-up"/);
    expect(workflow).not.toMatch(/\|\|\s*'ramp-up'/);
  });

  it("keeps dashboard Lighthouse as an explicit manual diagnostic", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github/workflows/lighthouse-dashboard.yml"),
      "utf8",
    );
    const beforeRefInput = "$" + "{{ inputs.before_ref }}";
    const afterRefInput = "$" + "{{ inputs.after_ref }}";

    expect(workflow).toContain("  workflow_dispatch:");
    expect(workflow).not.toContain("  pull_request:");
    expect(workflow).toContain("    timeout-minutes: 60");
    expect(workflow).toContain(`BEFORE_REF="${beforeRefInput}"`);
    expect(workflow).toContain(`AFTER_REF="${afterRefInput}"`);
    expect(workflow).not.toContain("github.event.pull_request.head.sha");
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
      workflow.lastIndexOf("pnpm exec playwright test --config=e2e/playwright.config.ts"),
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

  it("keeps public URL reachability checks as a manual diagnostic tool", async () => {
    const rootPackage = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const urlHarness = await readFile(join(process.cwd(), "scripts/check-public-urls.mjs"), "utf8");
    const workflowDir = await readdir(join(process.cwd(), ".github/workflows"));

    expect(rootPackage.scripts?.["check:public-urls"]).toBe("node scripts/check-public-urls.mjs");
    expect(workflowDir).not.toContain("public-url-smoke.yml");
    expect(urlHarness).toContain("https://nebutra.com");
    expect(urlHarness).toContain("https://app.nebutra.com");
    expect(urlHarness).toContain("https://api.nebutra.com/api/misc/health");
    expect(urlHarness).toContain("database.status=up");
    expect(urlHarness).toContain("https://design.nebutra.com");
    expect(urlHarness).toContain("https://docs.nebutra.com");
    expect(urlHarness).toContain("https://nebutra.sanity.studio");
    expect(urlHarness).toContain("https://www.nebutra.com");
    expect(urlHarness).toContain("https://studio.nebutra.com");
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

    expect(bloomStrategy).toContain('import * as bloomFiltersNs from "bloom-filters"');
    expect(bloomStrategy).toContain(".default");
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

  it("keeps the green-path Playwright artifact payload lean", async () => {
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    const playwrightConfig = await readFile(
      join(process.cwd(), "e2e/playwright.config.ts"),
      "utf8",
    );
    const matrixShard = "$" + "{{ matrix.shard }}";
    const githubRunId = "$" + "{{ github.run_id }}";

    expect(playwrightConfig).toContain('process.env.CI ? [["github"], ["blob"]] : [["html"]]');
    expect(workflow).toContain("Upload Playwright blob report");
    expect(workflow).toContain(`name: playwright-blob-report-shard-${matrixShard}`);
    expect(workflow).toContain("path: blob-report/");
    expect(workflow).toContain("compression-level: 0");
    expect(workflow).toContain("Upload Playwright failure diagnostics");
    expect(workflow).toContain("if: failure()");
    expect(workflow).toContain(`pattern: playwright-blob-report-shard-*-${githubRunId}`);
    expect(workflow).not.toContain(`pattern: playwright-report-shard-*-${githubRunId}`);
    expect(workflow).not.toContain('["html", { open: "never" }]');
  });

  it("uses bounded E2E health endpoints for Next.js webServer readiness", async () => {
    const playwrightConfig = await readFile(
      join(process.cwd(), "e2e/playwright.config.ts"),
      "utf8",
    );

    expect(playwrightConfig).toContain("/api/e2e/health");
    await Promise.all(
      [
        "apps/landing/src/app/api/e2e/health/route.ts",
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
    // Specs gate via getAuthCapabilityStatus("auth-smoke"), which requires E2E_AUTH_SMOKE=1.
    expect(authSpec).toContain('getAuthCapabilityStatus("auth-smoke")');
    expect(dashboardSpec).toContain('getAuthCapabilityStatus("auth-smoke")');
    expect(authSpec).toContain("test.skip");
    expect(dashboardSpec).toContain("test.skip");
    const authFixture = await readFile(join(process.cwd(), "e2e/fixtures/auth.ts"), "utf8");
    expect(authFixture).toContain("E2E_AUTH_SMOKE");
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
    expect(globalSetup).toContain('path: "/api/e2e/health", required: true');
    expect(globalSetup).toContain('path: "/changelog", required: false');
    expect(globalSetup).toContain("optional prewarm skipped");
    expect(globalSetup).toContain("ROUTE_PREWARM_TIMEOUT_MS");
    expect(globalSetup).toContain("fetchWithTimeout");
    expect(helper).toContain('waitUntil: "domcontentloaded"');
    expect(helper).toContain("NAVIGATION_RETRIES");
    expect(helper).not.toContain("page.request.get");
    expect(helper).toContain("page.goto: Timeout");
    expect(helper).toContain("net::ERR_ABORTED");
    expect(changelogSpec).toContain("gotoMarketingPage");
    expect(footerSpec).toContain("gotoMarketingPage");
  });

  it("backs footer design smoke assertions with a real component marker", async () => {
    const footer = await readFile(
      join(process.cwd(), "apps/landing/src/components/landing/FooterMinimal.tsx"),
      "utf8",
    );

    // No separator above the footer. It was a 1px div painted with
    // --brand-gradient, whose first stop is blue-9 at full saturation — a value
    // the token rules keep off component surfaces. Someone had already replaced
    // it with a neutral border once; it came back as the gradient and this
    // assertion was left expecting the neutral token, so it had been failing
    // rather than preventing the regression.
    //
    // Asserting its absence rather than its color: the footer separates itself
    // from the article by whitespace and a background shift, which is how the
    // rest of the surface does it.
    expect(footer).not.toContain("footer-gradient-line");
    expect(footer).not.toContain("--brand-gradient");
    expect(footer).toContain("AuroraBackground");
  });
});
