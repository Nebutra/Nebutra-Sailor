#!/usr/bin/env node
/**
 * Compile Refero export → Brand Package + skin CSS
 *
 *   node packages/design/tokens/scripts/compile-brand.mjs ~/Desktop/GSAP --id gsap
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../../..");
const tsx = join(repoRoot, "node_modules/.bin/tsx");
const runner = join(packageRoot, "scripts/compile-brand-run.ts");

const r = spawnSync(
  existsSync(tsx) ? tsx : "npx",
  existsSync(tsx) ? [runner, ...process.argv.slice(2)] : ["tsx", runner, ...process.argv.slice(2)],
  {
    stdio: "inherit",
    cwd: packageRoot,
  },
);
process.exit(r.status ?? 1);
