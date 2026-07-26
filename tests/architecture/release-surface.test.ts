import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getReleaseSurfaceDiagnostics } from "../../scripts/lib/release-surface.mjs";

describe("release surface governance", () => {
  const diagnostics = getReleaseSurfaceDiagnostics();

  it("keeps changesets pointed at packages that still exist", () => {
    expect(diagnostics.missingChangesetPackages).toEqual([]);
  });

  it("does not publish packages with private runtime workspace dependencies", () => {
    expect(diagnostics.privateRuntimeDependencies).toEqual([]);
  });

  it("keeps internal workspace dependencies on workspace protocol", () => {
    const workspacePackageNames = new Set(diagnostics.packages.map((entry) => entry.manifest.name));
    const nonWorkspaceDependencies = [];

    for (const entry of diagnostics.packages) {
      for (const field of [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
        "peerDependencies",
      ] as const) {
        for (const [dependencyName, specifier] of Object.entries(entry.manifest[field] ?? {})) {
          if (
            workspacePackageNames.has(dependencyName) &&
            typeof specifier === "string" &&
            !specifier.startsWith("workspace:")
          ) {
            nonWorkspaceDependencies.push(
              `${entry.manifest.name} ${field}.${dependencyName}=${specifier}`,
            );
          }
        }
      }
    }

    expect(nonWorkspaceDependencies).toEqual([]);
  });

  it("keeps scoped publishable packages npm/GitHub discoverable", () => {
    expect(diagnostics.requiredMetadataMissing).toEqual([]);
  });

  it("does not declare runtime entrypoints that package files exclude", () => {
    expect(diagnostics.manifestRuntimeFilesExcludedByFiles).toEqual([]);
  });

  it("publishes registry packages under MIT", () => {
    const nonMitPackages = diagnostics.publishable
      .filter((entry) => entry.manifest.license !== "MIT")
      .map((entry) => `${entry.manifest.name} (${entry.manifest.license ?? "missing"})`);

    expect(nonMitPackages).toEqual([]);
  });

  /**
   * The `license` field is a label; the LICENSE file is the grant. MIT itself
   * requires its notice to travel with "all copies or substantial portions",
   * and npm always includes a LICENSE file in the tarball regardless of the
   * `files` field — so every publishable package must carry one.
   *
   * This caught create-sailor shipping the full AGPL-3.0 text while declaring
   * MIT, and 78 packages shipping no licence text at all.
   */
  it("ships an MIT LICENSE file alongside the MIT license field", () => {
    const offenders = diagnostics.publishable
      .map((entry) => {
        const licensePath = join(entry.packageDir, "LICENSE");
        if (!existsSync(licensePath)) return `${entry.manifest.name} (no LICENSE file)`;
        const head = readFileSync(licensePath, "utf-8").slice(0, 200);
        if (!head.includes("MIT License")) {
          const firstLine = head.split("\n").find((line) => line.trim().length > 0) ?? "";
          return `${entry.manifest.name} (LICENSE is not MIT: "${firstLine.trim()}")`;
        }
        return null;
      })
      .filter((offender): offender is string => offender !== null);

    expect(offenders).toEqual([]);
  });
});
