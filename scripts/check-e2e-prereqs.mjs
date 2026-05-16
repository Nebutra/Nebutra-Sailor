#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

const MIN_NODE_MAJOR = 22;
const MIN_PNPM_MAJOR = 10;
const VALID_AUTH_PROVIDERS = new Set(["clerk", "better-auth", "nextauth", "dev"]);

function fail(message, details) {
  process.stderr.write(`[e2e-preflight] ${message}\n`);
  if (details) {
    process.stderr.write(`${details.trim()}\n`);
  }
  process.exitCode = 1;
}

function ok(message) {
  process.stdout.write(`[e2e-preflight] ok: ${message}\n`);
}

function checkNodeVersion() {
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);

  if (Number.isNaN(major) || major < MIN_NODE_MAJOR) {
    fail(`Node.js ${MIN_NODE_MAJOR}+ is required; current version is ${process.version}.`);
    return;
  }

  ok(`Node.js ${process.version}`);
}

function checkPnpm() {
  const result = spawnSync("pnpm", ["--version"], {
    encoding: "utf8",
    shell: false,
  });

  if (result.error || result.status !== 0) {
    fail(
      "pnpm is not available on PATH.",
      result.error?.message ??
        result.stderr ??
        "Install via corepack, or run this through `pnpm check:e2e-env`.",
    );
    return;
  }

  const version = result.stdout.trim();
  const major = Number.parseInt(version.split(".")[0] ?? "0", 10);
  if (Number.isNaN(major) || major < MIN_PNPM_MAJOR) {
    fail(`pnpm ${MIN_PNPM_MAJOR}+ is required; current version is ${version}.`);
    return;
  }

  ok(`pnpm ${version}`);
}

function checkAuthProviderEnv() {
  const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? process.env.AUTH_PROVIDER ?? "clerk";

  if (!VALID_AUTH_PROVIDERS.has(provider)) {
    fail(
      `NEXT_PUBLIC_AUTH_PROVIDER/AUTH_PROVIDER must be one of ${[...VALID_AUTH_PROVIDERS].join(
        ", ",
      )}; received "${provider}".`,
    );
    return;
  }

  ok(`auth provider ${provider}`);
}

async function checkNextSwc() {
  try {
    const swc = await import("next/dist/build/swc/index.js");
    const bindings = await swc.loadBindings(false);

    if (typeof bindings?.transformSync !== "function") {
      throw new Error("Next SWC bindings loaded without transformSync.");
    }

    ok("Next SWC native bindings loaded");
  } catch (error) {
    const reason = error instanceof Error ? error.stack || error.message : String(error);
    fail(
      "Next SWC native bindings cannot load before Playwright starts web servers.",
      [
        reason,
        "",
        "Common macOS local cause: Node or native packages are code-signed by different Team IDs.",
        "Use the repo Node 22 toolchain, reinstall dependencies, then rerun `pnpm check:e2e-env`.",
      ].join("\n"),
    );
  }
}

checkNodeVersion();
checkPnpm();
checkAuthProviderEnv();
await checkNextSwc();

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
