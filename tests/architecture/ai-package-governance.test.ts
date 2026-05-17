import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const AI_ROOT = join(ROOT, "packages", "ai");

type PackageStatus = "stable" | "foundation" | "wip" | "deprecated";

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  nebutra?: {
    status?: PackageStatus;
    productionReady?: boolean;
    gaps?: string[];
  };
}

function readPackageJson(packageDir: string): PackageJson {
  return JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8")) as PackageJson;
}

function discoverAiPackages(): Array<{ dir: string; manifest: PackageJson }> {
  return readdirSync(AI_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(AI_ROOT, entry.name))
    .filter((dir) => existsSync(join(dir, "package.json")))
    .map((dir) => ({ dir, manifest: readPackageJson(dir) }))
    .filter(({ manifest }) => manifest.name?.startsWith("@nebutra/"));
}

describe("AI package architecture governance", () => {
  const packages = discoverAiPackages();
  const byName = new Map(packages.map((entry) => [entry.manifest.name, entry]));

  it("has a package-wide AGENTS contract that names the canonical runtime and gateway boundaries", () => {
    const agentsPath = join(AI_ROOT, "AGENTS.md");
    expect(existsSync(agentsPath)).toBe(true);

    const contract = readFileSync(agentsPath, "utf8");
    expect(contract).toContain("@nebutra/agents");
    expect(contract).toContain("canonical model-execution runtime");
    expect(contract).toContain("@nebutra/ai-providers");
    expect(contract).toContain("metadata only");
    expect(contract).toContain("@nebutra/llm-gateway");
    expect(contract).toContain("not the production gateway");
  });

  it("keeps AI SDK provider execution canonical in @nebutra/agents", () => {
    const agents = byName.get("@nebutra/agents")?.manifest;
    expect(agents?.dependencies?.ai ?? agents?.peerDependencies?.ai).toBeDefined();
    expect(agents?.dependencies?.["@ai-sdk/openai"]).toBeDefined();

    const aiProviders = byName.get("@nebutra/ai-providers")?.manifest;
    expect(aiProviders?.dependencies ?? {}).toEqual({});
  });

  it("marks legacy local provider experiments as non-production surfaces", () => {
    for (const packageName of ["@nebutra/llm-gateway", "@nebutra/provider-registry"]) {
      const manifest = byName.get(packageName)?.manifest;
      expect(manifest?.nebutra?.status, packageName).toBe("wip");
      expect(manifest?.nebutra?.productionReady, packageName).toBe(false);
      expect(manifest?.nebutra?.gaps?.length ?? 0, packageName).toBeGreaterThan(0);
    }
  });

  it("prevents new runtime packages from depending on the legacy local provider registry", () => {
    const violations: string[] = [];

    for (const { manifest } of packages) {
      if (!manifest.name || manifest.name === "@nebutra/llm-gateway") continue;
      const deps = { ...manifest.dependencies, ...manifest.devDependencies };
      if (deps["@nebutra/provider-registry"] === "workspace:*") {
        violations.push(`${manifest.name} -> @nebutra/provider-registry`);
      }
    }

    expect(violations).toEqual([]);
  });
});
