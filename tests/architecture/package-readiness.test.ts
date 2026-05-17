import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PACKAGE_DIR = join(ROOT, "packages");

type PackageStatus = "stable" | "foundation" | "wip" | "deprecated";

type NebutraPackageManifest = {
  name: string;
  // Absolute path to the package directory (added at scan time so callers can
  // resolve sibling files like README.md without re-deriving the group dir).
  __packageDir: string;
  nebutra?: {
    status?: PackageStatus;
    productionReady?: boolean;
    gaps?: string[];
  };
};

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

// Packages live at packages/<group>/<name>/package.json (W3b 2-level layout).
async function readWorkspaceReadinessPackages(): Promise<NebutraPackageManifest[]> {
  const manifests: NebutraPackageManifest[] = [];

  for (const groupEntry of readdirSync(PACKAGE_DIR, { withFileTypes: true })) {
    if (!groupEntry.isDirectory()) continue;
    const groupDir = join(PACKAGE_DIR, groupEntry.name);

    for (const pkgEntry of readdirSync(groupDir, { withFileTypes: true })) {
      if (!pkgEntry.isDirectory()) continue;
      const packageDir = join(groupDir, pkgEntry.name);
      const manifestPath = join(packageDir, "package.json");
      if (!existsSync(manifestPath)) continue;

      const manifest = await readJson<NebutraPackageManifest>(manifestPath);
      if (manifest.name?.startsWith("@nebutra/") && manifest.nebutra?.status) {
        manifests.push({ ...manifest, __packageDir: packageDir });
      }
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
      const readmePath = join(manifest.__packageDir, "README.md");
      const cliStatusRegistry = await readFile(
        join(ROOT, "packages/ops/create-sailor/src/utils/package-status.ts"),
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
        // Match the banner regardless of markdown emphasis (**Foundation**, _Foundation_, etc.).
        expect(readme, `${manifest.name} README status`).toMatch(/Status:\s*[*_~]*Foundation/i);
        expect(statusDoc, `${manifest.name} docs status`).toContain(`\`${manifest.name}\``);
      } else if (status === "wip") {
        expect(manifest.nebutra?.productionReady, `${manifest.name} productionReady`).toBe(false);
        expect(manifest.nebutra?.gaps?.length ?? 0, `${manifest.name} gaps`).toBeGreaterThan(0);
        expect(readme, `${manifest.name} README status`).toMatch(/Status:\s*[*_~]*WIP/i);
        expect(statusDoc, `${manifest.name} docs status`).toContain(`\`${manifest.name}\``);
      }
    }
  });
});
