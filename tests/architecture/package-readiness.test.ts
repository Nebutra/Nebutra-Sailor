import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PACKAGE_DIR = join(ROOT, "packages");

type PackageStatus = "stable" | "foundation" | "wip" | "deprecated";

type NebutraPackageManifest = {
  name: string;
  nebutra?: {
    status?: PackageStatus;
    productionReady?: boolean;
    gaps?: string[];
  };
};

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function readWorkspaceReadinessPackages(): Promise<NebutraPackageManifest[]> {
  const manifests: NebutraPackageManifest[] = [];

  for (const entry of readdirSync(PACKAGE_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const manifestPath = join(PACKAGE_DIR, entry.name, "package.json");
    if (!existsSync(manifestPath)) continue;

    const manifest = await readJson<NebutraPackageManifest>(manifestPath);
    if (manifest.name?.startsWith("@nebutra/") && manifest.nebutra?.status) {
      manifests.push(manifest);
    }
  }

  return manifests.sort((a, b) => a.name.localeCompare(b.name));
}

describe("package readiness governance", () => {
  it("keeps package metadata, README banners, and package-status docs aligned", async () => {
    const manifests = await readWorkspaceReadinessPackages();
    const statusDoc = await readFile(join(ROOT, "docs/package-status.md"), "utf8");

    expect(manifests.length).toBeGreaterThan(0);

    for (const manifest of manifests) {
      const packageName = manifest.name.replace("@nebutra/", "");
      const readmePath = join(PACKAGE_DIR, packageName, "README.md");
      const cliStatusRegistry = await readFile(
        join(ROOT, "packages/create-sailor/src/utils/package-status.ts"),
        "utf8",
      );
      const readme = existsSync(readmePath) ? await readFile(readmePath, "utf8") : "";
      const status = manifest.nebutra?.status;

      if (status === "stable") {
        expect(manifest.nebutra?.productionReady, `${manifest.name} productionReady`).toBe(true);
        expect(manifest.nebutra?.gaps ?? [], `${manifest.name} stable gaps`).toHaveLength(0);
        expect(readme, `${manifest.name} README should not carry preview status`).not.toMatch(
          /Status: (WIP|Foundation)/,
        );
        expect(statusDoc, `${manifest.name} should not be listed as WIP/Foundation`).not.toContain(
          `\`${manifest.name}\``,
        );
        expect(
          cliStatusRegistry,
          `${manifest.name} should not be listed in create-sailor preview registry`,
        ).not.toContain(`${packageName}:`);
        expect(
          cliStatusRegistry,
          `${manifest.name} should not be listed in create-sailor preview registry`,
        ).not.toContain(`"${packageName}":`);
      } else if (status === "foundation") {
        expect(manifest.nebutra?.productionReady, `${manifest.name} productionReady`).toBe(false);
        expect(manifest.nebutra?.gaps?.length ?? 0, `${manifest.name} gaps`).toBeGreaterThan(0);
        expect(readme, `${manifest.name} README status`).toContain("Status: Foundation");
        expect(statusDoc, `${manifest.name} docs status`).toContain(`\`${manifest.name}\``);
      } else if (status === "wip") {
        expect(manifest.nebutra?.productionReady, `${manifest.name} productionReady`).toBe(false);
        expect(manifest.nebutra?.gaps?.length ?? 0, `${manifest.name} gaps`).toBeGreaterThan(0);
        expect(readme, `${manifest.name} README status`).toContain("Status: WIP");
        expect(statusDoc, `${manifest.name} docs status`).toContain(`\`${manifest.name}\``);
      }
    }
  });
});
