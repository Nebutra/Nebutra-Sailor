#!/usr/bin/env node
/**
 * Copy playwright + playwright-core into a Next standalone stage directory.
 * Used by deploy-ecs.yml when assembling the forge VM bundle.
 *
 *   STAGE=/path/to/stage node scripts/copy-forge-playwright-to-standalone.mjs
 */
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const stage = process.env.STAGE;
if (!stage) {
  console.error("STAGE env required");
  process.exit(1);
}

const req = createRequire(join(root, "apps/forge/package.json"));
// Replace any symlink/file placeholders left by Next standalone with real dirs.
for (const name of ["playwright", "playwright-core"]) {
  let pkgDir;
  try {
    pkgDir = dirname(req.resolve(`${name}/package.json`));
  } catch (err) {
    console.error(`Missing ${name} for forge bundle:`, err);
    process.exit(1);
  }
  const dest = join(stage, "node_modules", name);
  mkdirSync(dirname(dest), { recursive: true });
  rmSync(dest, { recursive: true, force: true });
  cpSync(pkgDir, dest, { recursive: true });
  console.log(`copied ${name} -> ${dest}`);
}
