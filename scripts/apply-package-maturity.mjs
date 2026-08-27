#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { classifyPackage } from "./lib/package-maturity.mjs";
import { getReleaseSurfaceDiagnostics } from "./lib/release-surface.mjs";

const dryRun = process.argv.includes("--dry-run");
const { packages } = getReleaseSurfaceDiagnostics();
let changed = 0;

for (const entry of packages) {
  const next = classifyPackage(entry);
  const original = readFileSync(entry.manifestPath, "utf8");
  let text = original;
  const meta = entry.manifest.nebutra;

  if (!meta) {
    const block = {
      status: next.status,
      graph: next.graph,
      productionReady: false,
    };
    const rendered = JSON.stringify(block, null, 2)
      .split("\n")
      .map((line, index) => (index === 0 ? line : `  ${line}`))
      .join("\n");
    const inserted = `\n  "nebutra": ${rendered},`;
    if (/\n {2}"private": (?:true|false),/.test(text)) {
      text = text.replace(/(\n {2}"private": (?:true|false),)/, `$1${inserted}`);
    } else if (/\n {2}"version": "[^"]+",/.test(text)) {
      text = text.replace(/(\n {2}"version": "[^"]+",)/, `$1${inserted}`);
    } else {
      throw new Error(`Cannot insert nebutra block into ${entry.relativeDir}/package.json`);
    }
  } else {
    const additions = [];
    if (!next.declaredStatus) additions.push(`    "status": ${JSON.stringify(next.status)},`);
    if (!next.declaredGraph) additions.push(`    "graph": ${JSON.stringify(next.graph)},`);
    if (additions.length > 0) {
      text = text.replace(/"nebutra"\s*:\s*\{/, `"nebutra": {\n${additions.join("\n")}`);
    }
  }

  if (text === original) continue;
  changed += 1;
  if (!dryRun) writeFileSync(entry.manifestPath, text);
  console.log(
    `${dryRun ? "would update" : "updated"} ${entry.manifest.name} → ${next.graph}/${next.status}`,
  );
}

console.log(`[package-maturity] ${dryRun ? "would change" : "changed"} ${changed} manifests`);
