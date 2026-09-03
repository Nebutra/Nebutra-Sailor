#!/usr/bin/env node
/**
 * sailor-version.mjs — one version number for the core + runtime graph.
 *
 * Every publishable package whose `nebutra.graph` is `core` or `runtime` ships
 * in lockstep: `.changeset/config.json` lists them in a single `fixed` group, so
 * `changeset version` moves all of them to the same number whenever any one of
 * them carries a changeset. That number is the **sailor version**. Labs packages
 * version on their own, and so do the unscoped CLIs (`create-sailor`, `nebutra`)
 * — they are installed by plain npm under a separate publish identity
 * (config/npm-publish-identity.json) and must not drag the graph with them.
 *
 * Changesets converges a fixed group on the highest version currently in it
 * (@changesets/assemble-release-plan `matchFixedConstraint`), so until the
 * first lockstep release the sailor version is simply that maximum.
 *
 * This script is the source of the group. The config file is a projection of
 * it, and tests/architecture/sailor-version.test.ts fails when they disagree,
 * so a new core or runtime package must join the group before it merges.
 *
 * Usage:
 *   node scripts/sailor-version.mjs            # print the current sailor version
 *   node scripts/sailor-version.mjs --group    # print the group, one name per line
 *   node scripts/sailor-version.mjs --check    # exit 1 when config.json's fixed group drifts
 *   node scripts/sailor-version.mjs --write    # rewrite config.json's fixed group
 */
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { classifyPackage, isReleaseGraph } from "./lib/package-maturity.mjs";
import { readWorkspacePackages } from "./lib/release-surface.mjs";

export const CHANGESET_CONFIG = ".changeset/config.json";

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * Membership rule. Kept as one predicate so the CLI, the check and the tests
 * cannot disagree about who is in the group.
 */
export function isSailorGroupMember(entry) {
  const { manifest } = entry;
  if (typeof manifest.name !== "string") return false;
  if (manifest.private === true) return false;
  // Unscoped names are the CLIs: separate publish identity, separate cadence.
  if (!manifest.name.startsWith("@")) return false;
  return isReleaseGraph(classifyPackage(entry).graph);
}

/** @returns {{ name: string, version: string, graph: string, dir: string }[]} sorted by name */
export function computeSailorGroup(root = process.cwd()) {
  return readWorkspacePackages(root)
    .filter(isSailorGroupMember)
    .map((entry) => ({
      name: entry.manifest.name,
      version: String(entry.manifest.version ?? "0.0.0"),
      graph: classifyPackage(entry).graph,
      dir: entry.relativeDir.replaceAll("\\", "/"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function parseVersion(version) {
  const match = VERSION_PATTERN.exec(version);
  if (!match) {
    throw new Error(`"${version}" is not a semver version`);
  }
  return {
    parts: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function compareIdentifiers(a, b) {
  const aNumeric = /^\d+$/.test(a);
  const bNumeric = /^\d+$/.test(b);
  if (aNumeric && bNumeric) return Number(a) - Number(b);
  if (aNumeric) return -1; // numeric identifiers sort before alphanumeric ones
  if (bNumeric) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Numeric semver ordering — `0.10.0` is newer than `0.9.0`, and a prerelease
 * sorts before its release. Dependency-free on purpose: this file runs from a
 * clean checkout before `pnpm install`, exactly like scripts/lib/*.mjs.
 */
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if (left.parts[i] !== right.parts[i]) return left.parts[i] - right.parts[i];
  }
  if (left.prerelease.length === 0 && right.prerelease.length === 0) return 0;
  if (left.prerelease.length === 0) return 1;
  if (right.prerelease.length === 0) return -1;
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let i = 0; i < length; i += 1) {
    if (left.prerelease[i] === undefined) return -1;
    if (right.prerelease[i] === undefined) return 1;
    const order = compareIdentifiers(left.prerelease[i], right.prerelease[i]);
    if (order !== 0) return order;
  }
  return 0;
}

/** The highest version in the group — what changesets will converge on. */
export function getSailorVersion(root = process.cwd()) {
  const group = computeSailorGroup(root);
  if (group.length === 0) {
    throw new Error(`no publishable core/runtime package found under ${root}`);
  }
  return group
    .map((item) => item.version)
    .reduce((highest, version) => {
      return compareVersions(version, highest) > 0 ? version : highest;
    });
}

export function readChangesetConfig(root = process.cwd()) {
  return JSON.parse(readFileSync(join(root, CHANGESET_CONFIG), "utf8"));
}

/**
 * Compare config.json's fixed group with the computed set. Set semantics: the
 * order of names is a formatting concern, membership is the invariant.
 */
export function checkSailorGroup(root = process.cwd()) {
  const group = computeSailorGroup(root);
  const expected = new Set(group.map((item) => item.name));
  const config = readChangesetConfig(root);
  const fixed = Array.isArray(config.fixed) ? config.fixed : [];
  const problems = [];

  if (fixed.length !== 1 || !Array.isArray(fixed[0])) {
    problems.push(
      `${CHANGESET_CONFIG} must declare exactly one fixed group (found ${fixed.length}); ` +
        "the sailor version is one group, and this script owns it",
    );
  }

  const declared = fixed.flatMap((entry) => (Array.isArray(entry) ? entry : []));
  const seen = new Set();
  const duplicates = [];
  for (const name of declared) {
    if (seen.has(name)) duplicates.push(name);
    seen.add(name);
  }
  if (duplicates.length > 0) {
    problems.push(`duplicate names in the fixed group: ${duplicates.join(", ")}`);
  }

  const missing = group.filter((item) => !seen.has(item.name));
  const extra = [...seen].filter((name) => !expected.has(name)).sort();

  return {
    ok: problems.length === 0 && missing.length === 0 && extra.length === 0,
    problems,
    missing,
    extra,
    group,
    version: group.length > 0 ? getSailorVersion(root) : null,
  };
}

export function formatDrift(result) {
  const lines = [
    `[sailor-version] ${CHANGESET_CONFIG} fixed group drifts from the publishable core+runtime graph:`,
  ];
  for (const problem of result.problems) lines.push(`  - ${problem}`);
  if (result.missing.length > 0) {
    lines.push("  missing — publishable core/runtime packages not in the group:");
    for (const item of result.missing) {
      lines.push(`    - ${item.name} (${item.graph}, ${item.dir})`);
    }
  }
  if (result.extra.length > 0) {
    lines.push("  extra — in the group but not a publishable core/runtime package:");
    for (const name of result.extra) lines.push(`    - ${name}`);
  }
  lines.push(
    "  fix: node scripts/sailor-version.mjs --write " +
      "(or change nebutra.graph / private on the package, if the classification is what is wrong)",
  );
  return lines.join("\n");
}

/** Rewrite config.json's `fixed` to the computed group, leaving every other key alone. */
export function writeSailorGroup(root = process.cwd()) {
  const group = computeSailorGroup(root);
  const config = readChangesetConfig(root);
  config.fixed = [group.map((item) => item.name)];
  writeFileSync(join(root, CHANGESET_CONFIG), `${JSON.stringify(config, null, 2)}\n`);
  return group;
}

function usage() {
  return [
    "Usage: node scripts/sailor-version.mjs [--group | --check | --write]",
    "",
    "  (no flag)  print the current sailor version — the highest version in the group",
    "  --group    print the fixed group (publishable core + runtime packages), one per line",
    "  --check    exit 1 when .changeset/config.json's fixed group differs from the group",
    "  --write    rewrite .changeset/config.json's fixed group",
    "",
  ].join("\n");
}

export function main(argv = process.argv.slice(2), root = process.cwd()) {
  const flags = new Set(argv);
  if (flags.has("--help") || flags.has("-h")) {
    process.stdout.write(usage());
    return 0;
  }
  const modes = ["--group", "--check", "--write"].filter((flag) => flags.has(flag));
  const unknown = argv.filter((arg) => !["--group", "--check", "--write"].includes(arg));
  if (unknown.length > 0 || modes.length > 1) {
    process.stderr.write(usage());
    return 2;
  }

  if (modes[0] === "--group") {
    for (const item of computeSailorGroup(root)) process.stdout.write(`${item.name}\n`);
    return 0;
  }

  if (modes[0] === "--write") {
    const group = writeSailorGroup(root);
    process.stdout.write(
      `[sailor-version] wrote ${group.length} packages to ${CHANGESET_CONFIG} fixed group\n`,
    );
    return 0;
  }

  if (modes[0] === "--check") {
    const result = checkSailorGroup(root);
    if (!result.ok) {
      process.stderr.write(`${formatDrift(result)}\n`);
      return 1;
    }
    process.stdout.write(
      `[sailor-version] fixed group matches: ${result.group.length} packages at sailor version ${result.version}\n`,
    );
    return 0;
  }

  process.stdout.write(`${getSailorVersion(root)}\n`);
  return 0;
}

function invokedDirectly() {
  if (!process.argv[1]) return false;
  const self = fileURLToPath(import.meta.url);
  const entry = resolve(process.argv[1]);
  if (entry === self) return true;
  try {
    return realpathSync(entry) === realpathSync(self);
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  process.exit(main());
}
