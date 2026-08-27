#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const binName = process.platform === "win32" ? "next.cmd" : "next";
const nextBinCandidates = [
  path.join(process.cwd(), "node_modules", ".bin", binName),
  path.join(repoRoot, "node_modules", ".bin", binName),
];
const nextBin = nextBinCandidates.find((candidate) => existsSync(candidate)) ?? "next";
const args = ["typegen", ...process.argv.slice(2)];

const result = spawnSync(nextBin, args, {
  cwd: process.cwd(),
  env: process.env,
  encoding: "utf8",
  shell: false,
});

const stdout = result.stdout ?? "";
const stderr = result.stderr ?? "";
process.stdout.write(stdout);
process.stderr.write(stderr);

const combinedOutput = `${stdout}\n${stderr}`;
const fatalOutputPatterns = [
  /Failed to load SWC binary/i,
  /Unhandled Rejection/i,
  /Cannot find module ['"]@next\/swc/i,
  /Error: Cannot find module ['"]next\/dist/i,
];

if (result.error) {
  process.stderr.write(
    `[next-typegen-guard] failed to launch next typegen: ${result.error.message}\n`,
  );
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (fatalOutputPatterns.some((pattern) => pattern.test(combinedOutput))) {
  process.stderr.write(
    "[next-typegen-guard] next typegen printed a fatal loader error but exited 0; failing to avoid stale .next/types.\n",
  );
  process.exit(1);
}

if (!existsSync(path.join(process.cwd(), ".next", "types"))) {
  process.stderr.write(
    "[next-typegen-guard] next typegen exited 0 but did not produce .next/types.\n",
  );
  process.exit(1);
}
