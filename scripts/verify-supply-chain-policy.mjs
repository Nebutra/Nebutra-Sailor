#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const failures = [];

const approvedBuildScripts = new Set([
  "@parcel/watcher",
  "@sentry/cli",
  "esbuild",
  "msgpackr-extract",
]);
const pullRequestTargetAllowlist = new Set(["cla.yml", "labeler.yml"]);
const oidcWriteAllowlist = new Set(["docker-build-push.yml", "release.yml", "scorecard.yml"]);
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

  if (pkg.packageManager !== "pnpm@10.32.1") {
    fail('package.json must pin "packageManager": "pnpm@10.32.1"');
  }

  if (pkg.engines?.pnpm !== ">=10.32.0") {
    fail("package.json must require pnpm >=10.32.0 so supply-chain settings are available");
  }

  const allowedBuilds = pkg.pnpm?.onlyBuiltDependencies;
  if (!Array.isArray(allowedBuilds) || allowedBuilds.length === 0) {
    fail(
      "package.json must define pnpm.onlyBuiltDependencies as a reviewed install-script allowlist",
    );
    return;
  }

  for (const dependency of allowedBuilds) {
    if (dependency.includes("*")) {
      fail(`pnpm.onlyBuiltDependencies may not contain wildcard entry "${dependency}"`);
    }
    if (!approvedBuildScripts.has(dependency)) {
      fail(`pnpm.onlyBuiltDependencies contains unreviewed install-script package "${dependency}"`);
    }
  }

  for (const dependency of approvedBuildScripts) {
    if (!allowedBuilds.includes(dependency)) {
      fail(`pnpm.onlyBuiltDependencies is missing approved install-script package "${dependency}"`);
    }
  }

  if (pkg.pnpm?.dangerouslyAllowAllBuilds === true) {
    fail("package.json must not set pnpm.dangerouslyAllowAllBuilds=true");
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
}

function assertNpmrcPolicy() {
  const npmrc = parseNpmrc(readText(".npmrc"));

  for (const [key, expected] of [
    ["package-manager-strict", "true"],
    ["package-manager-strict-version", "true"],
    ["verify-deps-before-run", "error"],
  ]) {
    if (npmrc.get(key) !== expected) {
      fail(`.npmrc must set ${key}=${expected}`);
    }
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
