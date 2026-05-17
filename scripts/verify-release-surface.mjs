#!/usr/bin/env node
import { getReleaseSurfaceDiagnostics } from "./lib/release-surface.mjs";

const diagnostics = getReleaseSurfaceDiagnostics();

const failures = [
  ...diagnostics.missingChangesetPackages.map(
    (entry) =>
      `changeset ${entry.changeset} references ${entry.packageName}, which is not in the workspace`,
  ),
  ...diagnostics.privateRuntimeDependencies.map(
    (entry) =>
      `${entry.packageName} ${entry.field} includes private workspace package ${entry.dependencyName} (${entry.dependencyDir})`,
  ),
  ...diagnostics.requiredMetadataMissing.map(
    (entry) => `${entry.packageName} is missing ${entry.field}; expected ${entry.expected}`,
  ),
];

console.log(
  `[release-surface] ${diagnostics.publishableCount} publishable packages across ${diagnostics.packageCount} workspace manifests`,
);

if (failures.length > 0) {
  console.error("[release-surface] release surface is not publishable:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[release-surface] release surface is publishable");
