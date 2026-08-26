#!/usr/bin/env node
/**
 * Turbo --filter list for `release.yml` tests.
 *
 * The publishable graph is 80+ packages. Testing all of them on every CLI
 * hotfix made Release red for months. This script scopes tests to the
 * packages actually shipping this cycle:
 *
 *   1. Pending changesets (version-PR pass)
 *   2. package.json files bumped in HEAD (publish pass after version merge)
 *   3. Fallback: create-sailor + nebutra
 */
import { execSync } from "node:child_process";
import { getReleaseSurfaceDiagnostics, readChangesetPackageNames } from "./lib/release-surface.mjs";

function toFilters(names) {
  return [...new Set(names.filter(Boolean))].map((name) => `--filter=${name}`).join(" ");
}

const diagnostics = getReleaseSurfaceDiagnostics();
const publishable = new Set(diagnostics.publishable.map((entry) => entry.manifest.name));

const fromChangesets = [
  ...new Set(readChangesetPackageNames().map((entry) => entry.packageName)),
].filter((name) => publishable.has(name));

if (fromChangesets.length > 0) {
  process.stdout.write(`${toFilters(fromChangesets)}\n`);
  process.exit(0);
}

const nameByPackageJson = new Map(
  diagnostics.publishable.map((entry) => [
    `${entry.relativeDir}/package.json`,
    entry.manifest.name,
  ]),
);

let fromHead = [];
try {
  const changed = execSync("git diff-tree --no-commit-id --name-only -r HEAD", {
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  fromHead = changed
    .map((file) => nameByPackageJson.get(file))
    .filter((name) => typeof name === "string" && publishable.has(name));
} catch {
  fromHead = [];
}

const names = fromHead.length > 0 ? fromHead : ["create-sailor", "nebutra"];
process.stdout.write(`${toFilters(names)}\n`);
