#!/usr/bin/env node
/**
 * Thin wrapper — full multi-catalog translator lives at repo root:
 *   scripts/i18n-translate-sensenova.mjs
 *
 * Prefer from monorepo root:
 *   pnpm i18n:translate
 *   pnpm i18n:translate:landing
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const script = resolve(root, "scripts/i18n-translate-sensenova.mjs");
const args = ["--catalog", "landing", ...process.argv.slice(2)];
const result = spawnSync(process.execPath, [script, ...args], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
