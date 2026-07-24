/**
 * Re-emit all skin CSS files from brands/<id>/brand.json (SSOT).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { emitBrandCss, normalizeBrandPackage } from "../src/brand-package/index.ts";

const packageRoot = resolve(import.meta.dirname, "..");
const repoRoot = resolve(packageRoot, "../../..");
const brandsDir = join(packageRoot, "brands");
const skinsDir = join(packageRoot, "skins");
const biomeBin = join(repoRoot, "node_modules/.bin/biome");

if (!existsSync(brandsDir)) {
  throw new Error(`Missing brands dir: ${brandsDir}`);
}

mkdirSync(skinsDir, { recursive: true });

const ids = readdirSync(brandsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const written: string[] = [];
const cssPaths: string[] = [];

for (const id of ids) {
  const brandPath = join(brandsDir, id, "brand.json");
  if (!existsSync(brandPath)) {
    process.stderr.write(`skip ${id}: no brand.json\n`);
    continue;
  }
  const raw = JSON.parse(readFileSync(brandPath, "utf8"));
  const brand = normalizeBrandPackage({ ...raw, id: raw.id || id });
  const css = emitBrandCss(brand, { mode: "global" });

  // Single publish path: skins/<id>.css (no brands/<id>/skin.css mirror)
  const outPath = join(skinsDir, `${brand.id}.css`);
  writeFileSync(outPath, css);
  cssPaths.push(outPath);
  written.push(brand.id);
}

// Post-format so CI "governance lint guards" (biome check) stays green after
// typecheck/build re-emits skins in the same workspace.
if (cssPaths.length > 0 && existsSync(biomeBin)) {
  const fmt = spawnSync(biomeBin, ["format", "--write", ...cssPaths], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (fmt.status !== 0) {
    process.stderr.write(fmt.stderr || fmt.stdout || "biome format failed on skins\n");
    process.exit(fmt.status ?? 1);
  }
}

process.stdout.write(
  `emit-skins: ${written.length} skins from brand.json → skins/*.css\n` +
    `  ${written.join(", ")}\n`,
);
