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

  it("publishes registry packages under MIT", () => {
    const nonMitPackages = diagnostics.publishable
      .filter((entry) => entry.manifest.license !== "MIT")
      .map((entry) => `${entry.manifest.name} (${entry.manifest.license ?? "missing"})`);

    expect(nonMitPackages).toEqual([]);
  });
});
