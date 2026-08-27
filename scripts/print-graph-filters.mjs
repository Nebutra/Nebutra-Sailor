#!/usr/bin/env node
import { getPackageMaturityDiagnostics, isReleaseGraph } from "./lib/package-maturity.mjs";

const requested = process.argv[2] ?? "release";
if (requested !== "release" && !["core", "runtime", "labs"].includes(requested)) {
  console.error(`Usage: print-graph-filters.mjs [release|core|runtime|labs]`);
  process.exit(1);
}
const diagnostics = getPackageMaturityDiagnostics();
const names = diagnostics.packages
  .filter((item) => {
    if (requested === "release") return isReleaseGraph(item.graph);
    return item.graph === requested;
  })
  .map((item) => `--filter=${item.name}`);

process.stdout.write(`${names.join(" ")}\n`);
