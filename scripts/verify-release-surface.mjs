#!/usr/bin/env node
import { getNpmPublishIdentityDiagnostics } from "./lib/npm-publish-identity.mjs";
import {
  getPackageMaturityDiagnostics,
  PACKAGE_GRAPHS,
  PACKAGE_STATUSES,
} from "./lib/package-maturity.mjs";
import { getReleaseSurfaceDiagnostics } from "./lib/release-surface.mjs";

const diagnostics = getReleaseSurfaceDiagnostics();
const publishIdentity = getNpmPublishIdentityDiagnostics();

const failures = [
  ...diagnostics.missingChangesetPackages.map(
    (entry) =>
      `changeset ${entry.changeset} references ${entry.packageName}, which is not in the workspace`,
  ),
  ...diagnostics.privateRuntimeDependencies.map(
    (entry) =>
      `${entry.packageName} ${entry.field} includes private workspace package ${entry.dependencyName} (${entry.dependencyDir})`,
  ),
  ...diagnostics.monorepoProtocolRuntimeDependencies.map(
    (entry) =>
      `${entry.packageName} ${entry.field}.${entry.dependencyName} is "${entry.range}" — CLI packages must not declare monorepo-only protocols as production deps (npm cannot resolve workspace:/catalog:; bundle via tsup noExternal and keep the dep in devDependencies)`,
  ),
  ...diagnostics.requiredMetadataMissing.map(
    (entry) => `${entry.packageName} is missing ${entry.field}; expected ${entry.expected}`,
  ),
  ...diagnostics.manifestRuntimeFilesExcludedByFiles.map(
    (entry) =>
      `${entry.packageName} manifest references ${entry.reference}, but package files only include ${entry.files.join(", ")} (${entry.packageDir})`,
  ),
  ...publishIdentity.missingFromConfig.map(
    (name) =>
      `${name} is unscoped and publishable but missing from ${publishIdentity.identityPath}`,
  ),
  ...publishIdentity.extraInConfig.map(
    (name) => `${publishIdentity.identityPath} lists ${name}, which is not publishable`,
  ),
];

const maturity = getPackageMaturityDiagnostics();
for (const item of maturity.undeclaredStatus) {
  failures.push(`${item.name} is missing nebutra.status`);
}
for (const item of maturity.undeclaredGraph) {
  failures.push(`${item.name} is missing nebutra.graph`);
}
for (const item of maturity.packages) {
  if (!PACKAGE_STATUSES.includes(item.status)) {
    failures.push(`${item.name} has invalid nebutra.status=${item.status}`);
  }
  if (!PACKAGE_GRAPHS.includes(item.graph)) {
    failures.push(`${item.name} has invalid nebutra.graph=${item.graph}`);
  }
}

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
