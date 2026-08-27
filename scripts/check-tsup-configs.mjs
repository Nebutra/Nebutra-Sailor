#!/usr/bin/env node
// Fails fast when a workspace package declares "build": "tsup" but ships no
// tsup config — the recurring pattern that breaks turbo build on CI without a
// clear local signal. Walks every workspace package.json once via realpath dedup.
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const seen = new Set();
const violations = new Set();

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue; // pnpm hoists; don't follow.
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === ".turbo" ||
        entry.name === ".next" ||
        entry.name === "build" ||
        entry.name === ".source"
      )
        continue;
      walk(join(dir, entry.name));
      continue;
    }
    if (entry.name !== "package.json") continue;
    const pkgPath = join(dir, "package.json");
    let canonical;
    try {
      canonical = realpathSync(pkgPath);
    } catch {
      canonical = pkgPath;
    }
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    } catch {
      continue;
    }
    const build = pkg.scripts?.build ?? "";
    if (typeof build !== "string") continue;
    if (!/(^|\s)tsup(\s|$)/.test(build)) continue;
    // If build already specifies entries inline (e.g. `tsup src/index.ts ...`), tsup doesn't need a config file.
    if (/\btsup\s+\S/.test(build) && !/^\s*tsup\s*(&&|\|\||$)/.test(build)) continue;
    const hasConfig = ["tsup.config.ts", "tsup.config.js", "tsup.config.mjs"].some((f) =>
      existsSync(join(dir, f)),
    );
    if (!hasConfig) {
      violations.add(`${pkg.name ?? dir} — "build": "${build}"`);
    }
  }
}

for (const top of ["packages", "apps", "backends"]) {
  const abs = join(root, top);
  if (existsSync(abs)) walk(abs);
}

if (violations.size > 0) {
  console.error("✘ tsup config missing for the following packages:\n");
  for (const v of violations) console.error(`  - ${v}`);
  console.error(
    "\nAdd a minimal tsup.config.ts (entry: ['src/index.ts'], format: ['esm'], dts: true) or inline the entries in the build script.",
  );
  process.exit(1);
}
console.log(
  `✓ All ${seen.size} workspace package.json files checked; tsup configs present where needed.`,
);
