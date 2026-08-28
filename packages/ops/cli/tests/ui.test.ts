import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "./helpers.js";

describe("ui command", () => {
  const fixtureRoots: string[] = [];

  afterEach(() => {
    for (const root of fixtureRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  function writeUiContractFixture(): string {
    const root = mkdtempSync(join(tmpdir(), "nebutra-cli-ui-"));
    fixtureRoots.push(root);
    const manifestPath = join(root, "agent-manifest.json");
    const componentDir = join(root, "agent", "components");
    mkdirSync(componentDir, { recursive: true });

    const button = {
      name: "button",
      title: "Button",
      description: "Primary action primitive",
      status: "stable",
      maturity: "canonical",
      layer: "primitive",
      source: "packages/design/ui/src/primitives/button.tsx",
      href: "https://ui.nebutra.com/agent/components/button.json",
      tags: ["canonical", "primitive"],
      package: "@nebutra/ui",
      substrate: "native",
      imports: {
        package: "@nebutra/ui/primitives",
        registry: "https://ui.nebutra.com/r/button.json",
      },
      dependencies: { npm: ["class-variance-authority"], registry: [] },
      files: [{ path: "components/ui/button.tsx", type: "registry:ui" }],
      tokens: ["--neutral-1"],
      evidence: {
        source: true,
        docs: true,
        storybook: true,
        registry: true,
        tokens: true,
      },
      docs: {
        source: "/en/docs/components/button",
        routes: ["/en/docs/components/button"],
        lastVerified: "2026-05-21",
      },
      usage: {
        recommended: "Use package imports inside Nebutra apps.",
        antiPatterns: ["Do not import registry JSON as source of truth."],
      },
      migration: {
        requiredForBreakingChanges: true,
        codemods: [],
        hints: ["Breaking renames require a dry-run codemod entry."],
      },
    };

    writeFileSync(
      manifestPath,
      JSON.stringify({
        $schema: "https://ui.nebutra.com/schemas/nebutra-ui-agent.v1.json",
        name: "nebutra-ui-agent",
        version: 1,
        generatedAt: "2026-07-06",
        homepage: "https://ui.nebutra.com",
        registry: "https://ui.nebutra.com/registry.json",
        commands: [],
        rules: {
          sourceOfTruth: [],
          importPolicy: "Use package imports.",
          registryPolicy: "Registry is distribution.",
          tokenPolicy: "Tokens own CSS variables.",
        },
        components: [
          {
            name: button.name,
            title: button.title,
            description: button.description,
            status: button.status,
            maturity: button.maturity,
            layer: button.layer,
            source: button.source,
            href: button.href,
            tags: button.tags,
          },
        ],
      }),
    );
    writeFileSync(join(componentDir, "button.json"), JSON.stringify(button));
    return manifestPath;
  }

  it("searches the generated UI agent contract as JSON", async () => {
    const manifest = writeUiContractFixture();
    const result = await runCli([
      "ui",
      "search",
      "button",
      "--format",
      "json",
      "--limit",
      "3",
      "--manifest",
      manifest,
    ]);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.items[0].name).toBe("button");
    expect(parsed.total).toBeGreaterThanOrEqual(1);
  });

  it("prints one component contract", async () => {
    const manifest = writeUiContractFixture();
    const result = await runCli([
      "ui",
      "component",
      "button",
      "--format",
      "json",
      "--manifest",
      manifest,
    ]);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.name).toBe("button");
    expect(parsed.imports.package).toBe("@nebutra/ui/primitives");
    expect(parsed.evidence.docs).toBe(true);
  });

  it("validates production evidence for a canonical component", async () => {
    const manifest = writeUiContractFixture();
    const result = await runCli([
      "ui",
      "validate",
      "button",
      "--format",
      "json",
      "--manifest",
      manifest,
    ]);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toMatchObject({ name: "button", valid: true });
  });

  it("returns migration hints as a dry-run plan", async () => {
    const manifest = writeUiContractFixture();
    const result = await runCli([
      "ui",
      "migrate",
      "button",
      "--format",
      "json",
      "--manifest",
      manifest,
    ]);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.component).toBe("button");
    expect(parsed.dryRun).toBe(true);
    expect(parsed.hints.length).toBeGreaterThan(0);
  });
});
