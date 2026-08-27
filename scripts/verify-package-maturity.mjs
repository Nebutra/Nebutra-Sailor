#!/usr/bin/env node
import {
  getPackageMaturityDiagnostics,
  PACKAGE_GRAPHS,
  PACKAGE_STATUSES,
} from "./lib/package-maturity.mjs";

const diagnostics = getPackageMaturityDiagnostics();
const failures = [];

for (const item of diagnostics.undeclaredStatus) {
  failures.push(`${item.name} is missing nebutra.status`);
}
for (const item of diagnostics.undeclaredGraph) {
  failures.push(`${item.name} is missing nebutra.graph`);
}
for (const item of diagnostics.packages) {
  if (!PACKAGE_STATUSES.includes(item.status)) {
    failures.push(`${item.name} has invalid nebutra.status=${item.status}`);
  }
  if (!PACKAGE_GRAPHS.includes(item.graph)) {
    failures.push(`${item.name} has invalid nebutra.graph=${item.graph}`);
  }
  if (item.status === "stable" && item.productionReady !== true) {
    failures.push(`${item.name} is stable but productionReady is not true`);
  }
}

if (failures.length > 0) {
  console.error("[package-maturity] undeclared or invalid package metadata:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const counts = Object.fromEntries(
  PACKAGE_GRAPHS.map((graph) => [graph, diagnostics.byGraph[graph].length]),
);
console.log(
  `[package-maturity] ${diagnostics.packages.length} packages classified: core=${counts.core} runtime=${counts.runtime} labs=${counts.labs}`,
);
