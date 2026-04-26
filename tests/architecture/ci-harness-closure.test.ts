import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ci harness dependency closure", () => {
  it("builds app dependency closures before standalone app builds", async () => {
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");

    expect(workflow).toContain('pnpm turbo build --filter="@nebutra/landing-page^..."');
    expect(workflow).toContain('pnpm turbo build --filter="@nebutra/web^..."');
    expect(workflow).toContain('pnpm turbo build --filter="@nebutra/api-gateway^..."');
  });

  it("runs bundle analysis through the webpack analyzer path", async () => {
    const workflow = await readFile(join(process.cwd(), ".github/workflows/ci.yml"), "utf8");
    const webPackage = JSON.parse(
      await readFile(join(process.cwd(), "apps/web/package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    expect(workflow).toContain("pnpm --filter @nebutra/web analyze");
    expect(webPackage.scripts?.analyze).toContain("next build --webpack");
  });

  it("waits for a public web route in Playwright webServer readiness checks", async () => {
    const playwrightConfig = await readFile(join(process.cwd(), "playwright.config.ts"), "utf8");

    expect(playwrightConfig).toContain('url: "http://localhost:3001/demo/embed"');
  });

  it("declares dynamic workspace imports as package dependencies", async () => {
    const apiGatewayPackage = JSON.parse(
      await readFile(join(process.cwd(), "apps/api-gateway/package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };

    expect(apiGatewayPackage.dependencies?.["@nebutra/analytics"]).toBe("workspace:*");
  });
});
