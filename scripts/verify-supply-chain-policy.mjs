#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { parse } from "yaml";

const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const failures = [];

const approvedBuildScripts = new Set([
  "@bundled-es-modules/glob",
  "@clerk/shared",
  // workerd native installers (Cloudflare Workers / OpenNext / Wrangler)
  "@cloudflare/workerd-darwin-arm64",
  "@cloudflare/workerd-darwin-x64",
  "@cloudflare/workerd-linux-arm64",
  "@cloudflare/workerd-linux-x64",
  "@dao-xyz/sqlite3-vec",
  "@parcel/watcher",
  "@prisma/engines",
  "@sentry/cli",
  "@swc/core",
  "better-sqlite3",
  "core-js",
  "esbuild",
  "lefthook",
  "msgpackr-extract",
  "onnxruntime-node",
  "prisma",
  "protobufjs",
  "sharp",
  "style-dictionary",
  "workerd",
]);
const pullRequestTargetAllowlist = new Set(["cla.yml", "labeler.yml"]);
const oidcWriteAllowlist = new Set(["release.yml", "scorecard.yml"]);
const lockfileIndicators = [
  "@tanstack/setup",
  "github:tanstack/router#79ac49eedf774dd4b0cfa308722bc463cfe5885c",
  "router_init.js",
  "router_runtime.js",
  "tanstack_runner.js",
  "filev2.getsession.org",
  "git-tanstack.com",
];
const persistenceFiles = [".claude/router_runtime.js", ".claude/setup.mjs", ".vscode/setup.mjs"];
const persistenceConfigFiles = [".claude/settings.json", ".vscode/tasks.json"];
const persistenceConfigIndicators = [
  "router_runtime.js",
  "router_init.js",
  "tanstack_runner.js",
  "setup.mjs",
];

function pathFromRoot(...parts) {
  return join(root, ...parts);
}

function readText(path) {
  return readFileSync(pathFromRoot(path), "utf8");
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function fail(message) {
  failures.push(message);
}

function parseNpmrc(text) {
  const values = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    values.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
  }
  return values;
}

function listWorkflowFiles() {
  const dir = pathFromRoot(".github", "workflows");
  return readdirSync(dir)
    .filter((entry) => /\.(ya?ml)$/.test(entry))
    .map((entry) => join(dir, entry));
}

function assertRootPackagePolicy() {
  const pkg = readJson("package.json");

  if (pkg.packageManager !== "pnpm@11.28.5") {
    fail('package.json must pin "packageManager": "pnpm@11.28.5"');
  }

  if (pkg.engines?.pnpm !== ">=11.28.5") {
    fail("package.json must require pnpm >=11.28.5 so supply-chain settings are available");
  }

  if (pkg.pnpm) {
    fail(
      "package.json#pnpm is no longer read by current pnpm; move overrides, allowBuilds, and audit settings to pnpm-workspace.yaml",
    );
  }
}

function assertPnpmWorkspacePolicy() {
  const workspace = readText("pnpm-workspace.yaml");
  const minAge = workspace.match(/^minimumReleaseAge:\s*(\d+)\s*$/m);

  if (!minAge || Number(minAge[1]) < 1440) {
    fail("pnpm-workspace.yaml must set minimumReleaseAge to at least 1440 minutes");
  }
  if (!/^trustPolicy:\s*no-downgrade\s*$/m.test(workspace)) {
    fail("pnpm-workspace.yaml must set trustPolicy: no-downgrade");
  }
  if (!/^strictDepBuilds:\s*true\s*$/m.test(workspace)) {
    fail("pnpm-workspace.yaml must set strictDepBuilds: true");
  }
  if (!/^ignorePnpmfile:\s*true\s*$/m.test(workspace)) {
    fail("pnpm-workspace.yaml must set ignorePnpmfile: true");
  }
  if (/^dangerouslyAllowAllBuilds:\s*true\s*$/m.test(workspace)) {
    fail("pnpm-workspace.yaml must not set dangerouslyAllowAllBuilds: true");
  }
  if (!/^(?:overrides|"overrides"):\s*$/m.test(workspace)) {
    fail("pnpm-workspace.yaml must define overrides so security pins are actually applied");
  }

  const parsedWorkspace = parse(workspace, { uniqueKeys: true });
  if (parsedWorkspace.dangerouslyAllowAllBuilds !== false) {
    fail(
      "pnpm-workspace.yaml must explicitly set dangerouslyAllowAllBuilds: false to override user config",
    );
  }
  const allowBuilds = new Map(Object.entries(parsedWorkspace.allowBuilds ?? {}));
  if (parsedWorkspace.verifyDepsBeforeRun !== "error") {
    fail("pnpm-workspace.yaml must set verifyDepsBeforeRun: error");
  }
  if (allowBuilds.size === 0) {
    fail("pnpm-workspace.yaml must define allowBuilds as a reviewed install-script allowlist");
    return;
  }

  for (const [dependency, allowed] of allowBuilds) {
    if (dependency.includes("*")) {
      fail(`allowBuilds may not contain wildcard entry "${dependency}"`);
    }
    if (allowed !== true || !approvedBuildScripts.has(dependency)) {
      fail(`allowBuilds contains unreviewed install-script package "${dependency}"`);
    }
  }

  for (const dependency of approvedBuildScripts) {
    if (allowBuilds.get(dependency) !== true) {
      fail(`allowBuilds is missing approved install-script package "${dependency}"`);
    }
  }
}

function assertNpmrcPolicy() {
  const npmrc = parseNpmrc(readText(".npmrc"));

  for (const key of [
    "package-manager-strict",
    "package-manager-strict-version",
    "verify-deps-before-run",
    "public-hoist-pattern[]",
  ]) {
    if (npmrc.has(key)) fail(`.npmrc contains removed pnpm 11 setting ${key}`);
  }

  for (const forbidden of [
    "ignore-scripts=false",
    "ignore-dep-scripts=false",
    "unsafe-perm=true",
  ]) {
    if (readText(".npmrc").includes(forbidden)) {
      fail(`.npmrc must not contain ${forbidden}`);
    }
  }
}

function assertLockfileIocs() {
  const lockfilePath = pathFromRoot("pnpm-lock.yaml");
  if (!existsSync(lockfilePath)) {
    fail("pnpm-lock.yaml is required for reproducible installs");
    return;
  }

  const lockfile = readFileSync(lockfilePath, "utf8");
  for (const indicator of lockfileIndicators) {
    if (lockfile.includes(indicator)) {
      fail(`pnpm-lock.yaml contains supply-chain IOC "${indicator}"`);
    }
  }
}

function assertPersistenceIocs() {
  for (const path of persistenceFiles) {
    if (existsSync(pathFromRoot(path))) {
      fail(`repository contains Mini Shai-Hulud persistence file ${path}`);
    }
  }

  for (const path of persistenceConfigFiles) {
    const absolute = pathFromRoot(path);
    if (!existsSync(absolute)) continue;
    const content = readFileSync(absolute, "utf8");
    for (const indicator of persistenceConfigIndicators) {
      if (content.includes(indicator)) {
        fail(`${path} references suspicious persistence indicator "${indicator}"`);
      }
    }
  }
}

function assertWorkflowPolicy() {
  for (const file of listWorkflowFiles()) {
    const workflowName = basename(file);
    const workflow = readFileSync(file, "utf8");
    const relativePath = relative(root, file);
    const usesPullRequestTarget = /\bpull_request_target\s*:/.test(workflow);

    if (usesPullRequestTarget && !pullRequestTargetAllowlist.has(workflowName)) {
      fail(`${relativePath} uses pull_request_target but is not in the reviewed allowlist`);
    }

    if (usesPullRequestTarget) {
      for (const pattern of [
        /actions\/checkout@/,
        /actions\/cache@/,
        /^\s*run:/m,
        /^\s*id-token:\s*write\s*$/m,
      ]) {
        if (pattern.test(workflow)) {
          fail(`${relativePath} combines pull_request_target with forbidden pattern ${pattern}`);
        }
      }
    }

    if (/^\s*id-token:\s*write\s*$/m.test(workflow) && !oidcWriteAllowlist.has(workflowName)) {
      fail(`${relativePath} grants id-token: write but is not in the OIDC allowlist`);
    }
  }
}

function assertNoSuspiciousFilesByName() {
  const ignoredDirectories = new Set([
    ".git",
    ".next",
    ".turbo",
    "coverage",
    "dist",
    "node_modules",
    "playwright-report",
    "test-results",
  ]);
  const suspiciousNames = new Set(["router_init.js", "router_runtime.js", "tanstack_runner.js"]);
  const stack = [root];

  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const absolute = join(dir, entry);
      let stat;
      try {
        stat = statSync(absolute);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        if (!ignoredDirectories.has(entry)) stack.push(absolute);
        continue;
      }

      if (suspiciousNames.has(entry)) {
        fail(`repository contains suspicious payload filename ${relative(root, absolute)}`);
      }
    }
  }
}

assertRootPackagePolicy();
assertPnpmWorkspacePolicy();
assertNpmrcPolicy();
assertLockfileIocs();
assertPersistenceIocs();
assertWorkflowPolicy();
assertNoSuspiciousFilesByName();

if (failures.length > 0) {
  console.error("[supply-chain] policy violations:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[supply-chain] policy verified");
