import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const AI_ROOT = join(ROOT, "packages", "ai");

type PackageStatus = "stable" | "foundation" | "wip" | "deprecated";

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  nebutra?: {
    status?: PackageStatus;
    productionReady?: boolean;
    gaps?: string[];
    surface?: string;
  };
}

const EXECUTION_CAPABILITY_PACKAGES = [
  "@nebutra/browser-control",
  "@nebutra/code-execution",
  "@nebutra/document-pipeline",
] as const;

const EXECUTION_CAPABILITY_FORBIDDEN_IMPORTS = [
  "@nebutra/agent-runtime",
  "@nebutra/agents",
  "ai",
  "@nebutra/llm-gateway",
  "@nebutra/provider-registry",
] as const;

const AGENT_RUNTIME_FORBIDDEN_IMPORTS = [
  "@nebutra/browser-control",
  "@nebutra/code-execution",
  "@nebutra/document-pipeline",
] as const;

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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function importPattern(packageName: string): RegExp {
  const escaped = escapeRegExp(packageName);
  return new RegExp(
    `(?:from\\s+["']${escaped}["']|import\\s+["']${escaped}["']|import\\(["']${escaped}["']\\))`,
  );
}

function collectProductionSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectProductionSourceFiles(path));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) continue;
    if (entry.name.endsWith(".d.ts")) continue;
    files.push(path);
  }

  return files;
}

function importViolations(
  packageDir: string,
  forbiddenImports: readonly string[],
): Array<{ file: string; imported: string }> {
  const sourceDir = join(packageDir, "src");
  const violations: Array<{ file: string; imported: string }> = [];

  for (const file of collectProductionSourceFiles(sourceDir)) {
    const source = readFileSync(file, "utf8");
    for (const forbiddenImport of forbiddenImports) {
      if (importPattern(forbiddenImport).test(source)) {
        violations.push({
          file: file.replace(`${ROOT}/`, ""),
          imported: forbiddenImport,
        });
      }
    }
  }

  return violations;
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
    expect(contract).toContain("Execution capability tools");
    expect(contract).toContain("must not own Thread/Turn/Item");
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

  it("classifies Layer 3 packages as execution capabilities with visible DX surfaces", () => {
    for (const packageName of EXECUTION_CAPABILITY_PACKAGES) {
      const entry = byName.get(packageName);
      expect(entry, packageName).toBeDefined();
      if (!entry) continue;

      expect(entry.manifest.nebutra?.status, packageName).toBe("wip");
      expect(entry.manifest.nebutra?.productionReady, packageName).toBe(false);
      expect(entry.manifest.nebutra?.surface, packageName).toBe("execution-capability");
      expect(entry.manifest.nebutra?.gaps?.length ?? 0, packageName).toBeGreaterThanOrEqual(3);
      expect(entry.manifest.scripts?.test, packageName).toBeDefined();
      expect(entry.manifest.scripts?.typecheck, packageName).toBeDefined();

      const examplesDir = join(entry.dir, "examples");
      const exampleCount = existsSync(examplesDir)
        ? readdirSync(examplesDir).filter((name) => name.endsWith(".ts")).length
        : 0;
      expect(exampleCount, packageName).toBeGreaterThanOrEqual(3);
      expect(existsSync(join(entry.dir, "README.md")), packageName).toBe(true);
    }
  });

  it("keeps execution capabilities out of runtime/model/provider ownership", () => {
    const violations: Array<{ packageName: string; file: string; imported: string }> = [];

    for (const packageName of EXECUTION_CAPABILITY_PACKAGES) {
      const entry = byName.get(packageName);
      if (!entry) continue;
      for (const violation of importViolations(entry.dir, EXECUTION_CAPABILITY_FORBIDDEN_IMPORTS)) {
        violations.push({ packageName, ...violation });
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps agent-runtime decoupled from concrete execution capability packages", () => {
    const entry = byName.get("@nebutra/agent-runtime");
    expect(entry).toBeDefined();
    if (!entry) return;

    expect(importViolations(entry.dir, AGENT_RUNTIME_FORBIDDEN_IMPORTS)).toEqual([]);
  });
});
