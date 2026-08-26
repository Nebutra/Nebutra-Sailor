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
 *   3. Local versions that are not on npm yet (follow-up CI commits after
 *      the version merge must not fall back to every CLI)
 */
import { execSync } from "node:child_process";
import { listPendingPublishablePackages } from "./lib/npm-publish-identity.mjs";
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

if (fromHead.length > 0) {
  process.stdout.write(`${toFilters(fromHead)}\n`);
  process.exit(0);
}

let pendingNames = [];
try {
  pendingNames = (await listPendingPublishablePackages()).map((entry) => entry.name);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[release-test-filters] npm lookup failed: ${message}`);
}

const names = pendingNames.length > 0 ? pendingNames : ["create-sailor"];
process.stdout.write(`${toFilters(names)}\n`);
