#!/usr/bin/env node
/**
 * Keep `packages/ops/preset/src/nebutra-package-versions.ts` locked to the
 * published package.json versions in this monorepo.
 *
 * Usage:
 *   node scripts/sync-nebutra-package-versions.mjs          # rewrite ranges
 *   node scripts/sync-nebutra-package-versions.mjs --check   # exit 1 on drift
 *   node scripts/sync-nebutra-package-versions.mjs --json    # machine report
 *
 * Only packages already listed in the registry map are updated. Adding a new
 * scaffold-facing package still requires an intentional map entry (with a
 * category comment) so we do not auto-publish every private workspace package
 * into user projects.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(REPO_ROOT, "packages/ops/preset/src/nebutra-package-versions.ts");

const CHECK = process.argv.includes("--check");
const JSON_OUT = process.argv.includes("--json");

/**
 * @param {string} dir
 * @param {string[]} acc
 */
function walkPackageJson(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".next" ||
      entry.name === "coverage"
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPackageJson(full, acc);
    } else if (entry.name === "package.json") {
      acc.push(full);
    }
  }
  return acc;
}

function loadWorkspacePackages() {
  /** @type {Map<string, { version: string, private: boolean, path: string }>} */
  const map = new Map();
  for (const pkgPath of walkPackageJson(path.join(REPO_ROOT, "packages"))) {
    try {
      const raw = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (typeof raw.name === "string" && typeof raw.version === "string") {
        map.set(raw.name, {
          version: raw.version,
          private: raw.private === true,
          path: path.relative(REPO_ROOT, pkgPath),
        });
      }
    } catch {
      // ignore malformed manifests
    }
  }
  return map;
}

/**
 * @param {string} source
 * @returns {Array<{ name: string, range: string, index: number, length: number }>}
 */
function parseRegistryEntries(source) {
  const entries = [];
  const re = /"(@nebutra\/[^"]+)":\s*"(\^[^"]+)"/g;
  let match = re.exec(source);
  while (match) {
    entries.push({
      name: match[1],
      range: match[2],
      index: match.index,
      length: match[0].length,
    });
    match = re.exec(source);
  }
  return entries;
}

function main() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error(`[package-versions] missing registry: ${REGISTRY_PATH}`);
    process.exit(1);
  }

  const source = fs.readFileSync(REGISTRY_PATH, "utf8");
  const entries = parseRegistryEntries(source);
  if (entries.length === 0) {
    console.error("[package-versions] no registry entries found");
    process.exit(1);
  }

  const workspace = loadWorkspacePackages();
  /** @type {Array<{ name: string, registered: string, expected: string | null, status: string, detail?: string }>} */
  const report = [];

  let next = source;
  // Replace from end to start so indices stay valid.
  const ordered = [...entries].sort((a, b) => b.index - a.index);

  for (const entry of ordered) {
    const pkg = workspace.get(entry.name);
    if (!pkg) {
      report.push({
        name: entry.name,
        registered: entry.range,
        expected: null,
        status: "missing_package",
        detail: "no packages/**/package.json with this name",
      });
      continue;
    }
    if (pkg.private) {
      report.push({
        name: entry.name,
        registered: entry.range,
        expected: `^${pkg.version}`,
        status: "private",
        detail: `${pkg.path} is private:true — user scaffolds must not depend on it`,
      });
      continue;
    }
    const expected = `^${pkg.version}`;
    if (entry.range === expected) {
      report.push({
        name: entry.name,
        registered: entry.range,
        expected,
        status: "ok",
      });
      continue;
    }
    report.push({
      name: entry.name,
      registered: entry.range,
      expected,
      status: "drift",
      detail: pkg.path,
    });
    if (!CHECK) {
      const replacement = `"${entry.name}": "${expected}"`;
      next = next.slice(0, entry.index) + replacement + next.slice(entry.index + entry.length);
    }
  }

  // Stable report order for humans
  report.sort((a, b) => a.name.localeCompare(b.name));

  const drifts = report.filter((r) => r.status === "drift");
  const errors = report.filter((r) => r.status === "missing_package" || r.status === "private");
  const ok = report.filter((r) => r.status === "ok");

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          registry: path.relative(REPO_ROOT, REGISTRY_PATH),
          check: CHECK,
          ok: ok.length,
          drift: drifts.length,
          errors: errors.length,
          report,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      `[package-versions] ${entries.length} registry entries · ${ok.length} ok · ${drifts.length} drift · ${errors.length} errors`,
    );
    for (const row of [...drifts, ...errors]) {
      const mark = row.status === "drift" ? "DRIFT" : "ERROR";
      console.log(
        `  ${mark} ${row.name}: registered ${row.registered} → expected ${row.expected ?? "n/a"}` +
          (row.detail ? ` (${row.detail})` : ""),
      );
    }
  }

  if (errors.length > 0) {
    process.exit(1);
  }

  if (CHECK) {
    if (drifts.length > 0) {
      console.error(
        "[package-versions] drift detected — run `pnpm package-versions:sync` and commit.",
      );
      process.exit(1);
    }
    console.log("[package-versions] registry matches package.json versions");
    return;
  }

  if (next !== source) {
    fs.writeFileSync(REGISTRY_PATH, next, "utf8");
    console.log(
      `[package-versions] updated ${drifts.length} range(s) in ${path.relative(REPO_ROOT, REGISTRY_PATH)}`,
    );
  } else {
    console.log("[package-versions] already in sync");
  }
}

main();
