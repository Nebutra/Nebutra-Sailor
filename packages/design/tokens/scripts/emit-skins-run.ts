/**
 * Re-emit all skin CSS files from brands/<id>/brand.json (SSOT).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { emitBrandCss, normalizeBrandPackage } from "../src/brand-package/index.ts";
import { formatGenerated } from "./format-generated.mjs";

const packageRoot = resolve(import.meta.dirname, "..");
const brandsDir = join(packageRoot, "brands");
const skinsDir = join(packageRoot, "skins");

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

// Soft-format only. Vercel's sandbox has no .gitignore; biome.json sets
// vcs.useIgnoreFile, so a hard exit here killed every landing/web deploy after
// the CSS had already been emitted correctly. Same contract as sync-styles.mjs.
if (cssPaths.length > 0) {
  formatGenerated(...cssPaths);
}

process.stdout.write(
  `emit-skins: ${written.length} skins from brand.json → skins/*.css\n` +
    `  ${written.join(", ")}\n`,
);
