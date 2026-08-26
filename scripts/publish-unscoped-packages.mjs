#!/usr/bin/env node
/**
 * Publish pending unscoped CLI packages (`create-sailor`, `nebutra`).
 *
 * The org-scoped `NPM_TOKEN` cannot PUT these names (npm E404). In GitHub
 * Actions this script strips that token and publishes with OIDC trusted
 * publishing. Locally it uses the operator's npm login.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  formatTrustedPublisherSetup,
  listPendingUnscopedPackages,
  npmVersionSupportsTrustedPublishing,
  readNpmPublishIdentity,
} from "./lib/npm-publish-identity.mjs";

const dryRun = process.argv.includes("--dry-run");

function npmVersion() {
  return execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
}

function ensureTrustedPublishingCli() {
  const version = npmVersion();
  if (npmVersionSupportsTrustedPublishing(version)) {
    console.log(`[unscoped-publish] npm ${version} supports trusted publishing`);
    return;
  }

  if (process.env.GITHUB_ACTIONS !== "true") {
    throw new Error(
      `npm ${version} cannot do trusted publishing. Install npm >= 11.5.1 or run this from Release CI.`,
    );
  }

  console.log(`[unscoped-publish] upgrading npm ${version} → 11.5.1 for OIDC`);
  execFileSync("npm", ["install", "-g", "npm@11.5.1"], { stdio: "inherit" });
}

function oidcEnv() {
  const env = { ...process.env };
  delete env.NODE_AUTH_TOKEN;
  delete env.NPM_TOKEN;
  delete env.npm_config__auth;
  delete env.npm_config__authToken;
  env.NPM_CONFIG_PROVENANCE = "true";

  if (process.env.GITHUB_ACTIONS === "true") {
    const npmrcDir = mkdtempSync(join(tmpdir(), "nebutra-oidc-npmrc-"));
    const npmrcPath = join(npmrcDir, ".npmrc");
    writeFileSync(npmrcPath, "registry=https://registry.npmjs.org/\n");
    env.NPM_CONFIG_USERCONFIG = npmrcPath;
  }

  return env;
}

function publishPackage(packageDir, env) {
  const args = ["publish", "--access", "public", "--ignore-scripts"];
  if (dryRun) args.push("--dry-run");

  execFileSync("npm", args, {
    cwd: packageDir,
    env,
    stdio: "inherit",
  });
}

const { diagnostics, pending } = await listPendingUnscopedPackages();

if (pending.length === 0) {
  console.log("[unscoped-publish] no pending unscoped packages");
  process.exit(0);
}

console.log(
  `[unscoped-publish] pending: ${pending.map((entry) => `${entry.name}@${entry.version}`).join(", ")}`,
);

if (process.env.GITHUB_ACTIONS === "true") {
  if (!process.env.ACTIONS_ID_TOKEN_REQUEST_URL || !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
    const identity = readNpmPublishIdentity();
    console.error("[unscoped-publish] GitHub OIDC token is not available.");
    console.error("Release job must set permissions.id-token: write.");
    for (const entry of pending) {
      console.error(formatTrustedPublisherSetup(identity, entry.name));
    }
    process.exit(1);
  }

  ensureTrustedPublishingCli();
}

const env = oidcEnv();

for (const entry of pending) {
  console.log(
    `[unscoped-publish] publishing ${entry.name}@${entry.version} from ${entry.packageDir}`,
  );
  try {
    publishPackage(entry.packageDir, env);
  } catch (error) {
    const identity = diagnostics.identity;
    console.error(`[unscoped-publish] failed to publish ${entry.name}@${entry.version}`);
    console.error(formatTrustedPublisherSetup(identity, entry.name));
    console.error(
      "An org-scoped NPM_TOKEN cannot publish this package. Do not retry Release until the trusted publisher exists.",
    );
    throw error;
  }
}

console.log(
  `[unscoped-publish] ${dryRun ? "dry-ran" : "published"} ${pending.length} unscoped package(s)`,
);
