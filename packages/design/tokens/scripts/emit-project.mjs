#!/usr/bin/env node
/**
 * The project's look: packages/design/tokens/project/ (a preset code, or a
 * hand-authored brand.json) → project.css + src/project.generated.ts.
 * Rendering lives in src/project/render.ts, shared with the drift test.
 *
 * Usage: node scripts/emit-project.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Prefer package-local / monorepo-hoisted tsx; fall back to npx for standalone mirrors.
const tsxCandidates = [
  join(packageRoot, "node_modules", ".bin", "tsx"),
  join(packageRoot, "..", "..", "..", "node_modules", ".bin", "tsx"),
];
const tsx = tsxCandidates.find((p) => existsSync(p));
const runner = join(packageRoot, "scripts/emit-project-run.ts");

const r = spawnSync(
  tsx ?? "npx",
  tsx ? [runner, ...process.argv.slice(2)] : ["tsx", runner, ...process.argv.slice(2)],
  {
    stdio: "inherit",
    cwd: packageRoot,
  },
);
process.exit(r.status ?? 1);
