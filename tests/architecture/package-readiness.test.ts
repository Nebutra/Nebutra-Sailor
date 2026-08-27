import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PACKAGE_DIR = join(ROOT, "packages");

type PackageStatus = "stable" | "foundation" | "wip" | "deprecated";
const VALID_PACKAGE_STATUSES = new Set<PackageStatus>([
  "stable",
  "foundation",
  "wip",
  "deprecated",
]);

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

function readStatusDocSection(doc: string, title: string) {
  const heading = new RegExp(`^## ${title} packages \\((\\d+)\\)\\s*$`, "m").exec(doc);
  if (!heading) {
    return { declaredCount: 0, packages: [] as string[] };
  }

  const start = (heading.index ?? 0) + heading[0].length;
  const rest = doc.slice(start);
  const nextHeading = rest.search(/^## /m);
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
  return {
    declaredCount: Number(heading[1] ?? 0),
    packages: Array.from(section.matchAll(/^\| `(@nebutra\/[^`]+)`/gm), (match) => {
      const packageName = match[1];
      if (!packageName) {
        throw new Error(`Malformed ${title} package row in docs/package-status.md`);
      }
      return packageName;
    }),
  };
}

describe("package readiness governance", () => {
  it("keeps package metadata, README banners, and package-status docs aligned", async () => {
    const manifests = await readWorkspaceReadinessPackages();
    const statusDoc = await readFile(join(ROOT, "docs/package-status.md"), "utf8");
    const docSections = {
      foundation: readStatusDocSection(statusDoc, "Foundation"),
      wip: readStatusDocSection(statusDoc, "WIP"),
      deprecated: readStatusDocSection(statusDoc, "Deprecated"),
    };
    const previewDocPackages = new Set(
      [
        ...docSections.foundation.packages,
        ...docSections.wip.packages,
        ...docSections.deprecated.packages,
      ].sort(),
    );

    expect(manifests.length).toBeGreaterThan(0);
    const documented = manifests.filter((manifest) => {
      const status = manifest.nebutra?.status;
      if (status === "stable") return true;
      return previewDocPackages.has(manifest.name);
    });

    for (const [status, section] of Object.entries(docSections)) {
      expect(section.packages, `${status} package-status count`).toHaveLength(
        section.declaredCount,
      );
      expect(new Set(section.packages).size, `${status} package-status duplicates`).toBe(
        section.packages.length,
      );
    }

    for (const manifest of documented) {
      const packageName = manifest.name.replace("@nebutra/", "");
      const readmePath = join(manifest.__packageDir, "README.md");
      const cliStatusRegistry = await readFile(
        join(ROOT, "packages/ops/create-sailor/src/utils/package-status.ts"),
        "utf8",
      );
      const readme = existsSync(readmePath) ? await readFile(readmePath, "utf8") : "";
      const status = manifest.nebutra?.status;

      expect(VALID_PACKAGE_STATUSES.has(status as PackageStatus), `${manifest.name} status`).toBe(
        true,
      );

      switch (status as PackageStatus) {
        case "stable":
          expect(manifest.nebutra?.productionReady, `${manifest.name} productionReady`).toBe(true);
          expect(manifest.nebutra?.gaps ?? [], `${manifest.name} stable gaps`).toHaveLength(0);
          expect(readme, `${manifest.name} README should not carry preview status`).not.toMatch(
            /Status: (WIP|Foundation|Deprecated)/,
          );
          expect(previewDocPackages.has(manifest.name), `${manifest.name} preview docs`).toBe(
            false,
          );
          expect(
            cliStatusRegistry,
            `${manifest.name} should not be listed in create-sailor preview registry`,
          ).not.toContain(`${packageName}:`);
          expect(
            cliStatusRegistry,
            `${manifest.name} should not be listed in create-sailor preview registry`,
          ).not.toContain(`"${packageName}":`);
          break;
        case "foundation":
          expect(manifest.nebutra?.productionReady, `${manifest.name} productionReady`).toBe(false);
          expect(manifest.nebutra?.gaps?.length ?? 0, `${manifest.name} gaps`).toBeGreaterThan(0);
          // Match the banner regardless of markdown emphasis (**Foundation**, _Foundation_, etc.).
          expect(readme, `${manifest.name} README status`).toMatch(/Status:\s*[*_~]*Foundation/i);
          expect(docSections.foundation.packages, `${manifest.name} docs status`).toContain(
            manifest.name,
          );
          break;
        case "wip":
          expect(manifest.nebutra?.productionReady, `${manifest.name} productionReady`).toBe(false);
          expect(manifest.nebutra?.gaps?.length ?? 0, `${manifest.name} gaps`).toBeGreaterThan(0);
          expect(readme, `${manifest.name} README status`).toMatch(/Status:\s*[*_~]*WIP/i);
          expect(docSections.wip.packages, `${manifest.name} docs status`).toContain(manifest.name);
          break;
        case "deprecated":
          expect(manifest.nebutra?.productionReady, `${manifest.name} productionReady`).toBe(false);
          expect(readme, `${manifest.name} README status`).toMatch(/Status:\s*[*_~]*Deprecated/i);
          expect(docSections.deprecated.packages, `${manifest.name} docs status`).toContain(
            manifest.name,
          );
          break;
      }
    }
  });
});
