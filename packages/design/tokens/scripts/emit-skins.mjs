#!/usr/bin/env node
/**
 * Skin CSS SSOT pipeline.
 *
 * Source of truth: brands/<id>/brand.json
 * Generated (do not hand-edit):
 *   - skins/<id>.css   (single publish path for @import / cssImport)
 *
 * Catalog: packages/design/theme/skins.css via theme scripts/sync-skins.mjs
 *
 * Usage: node scripts/emit-skins.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../../..");
const tsx = join(repoRoot, "node_modules/.bin/tsx");
const runner = join(packageRoot, "scripts/emit-skins-run.ts");

const r = spawnSync(
  existsSync(tsx) ? tsx : "npx",
  existsSync(tsx) ? [runner, ...process.argv.slice(2)] : ["tsx", runner, ...process.argv.slice(2)],
  {
    stdio: "inherit",
    cwd: packageRoot,
  },
);
process.exit(r.status ?? 1);
