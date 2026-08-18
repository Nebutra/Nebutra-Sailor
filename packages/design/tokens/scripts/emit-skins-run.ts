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

/**
 * Refuse to write a skin whose typography cannot render.
 *
 * next/font registers each self-hosted face under a hashed family name that is
 * reachable ONLY through its CSS variable, so a stack of bare names —
 * `"Mori", "Inter Tight", ui-sans-serif` — silently resolves to the system font
 * no matter how many families it lists. Every one of the seven built-in
 * languages was in that state, and nothing anywhere reported it: the CSS
 * parsed, the variable was set, the page rendered.
 *
 * `cssFontStack` prepends the nearest family in FONT_REGISTRY, so a declaration
 * without a leading `var(--font-…)` means the brand named nothing we self-host.
 * That is a brand-authoring mistake, and the only moment it is visible is here.
 */
function assertFontsCanRender(id: string, css: string): void {
  const dead = [...css.matchAll(/--font-(sans|heading|display|mono):\s*([^;]+);/g)].filter(
    (m) => !m[2].trim().startsWith("var(--font"),
  );
  if (dead.length === 0) return;
  throw new Error(
    `${id}: ${dead.map((m) => `--font-${m[1]}`).join(", ")} name no self-hosted family, ` +
      `so they would render in the system font. Add a family from FONT_REGISTRY ` +
      `(@nebutra/fonts) to the stack — registering the face there if it is a new one.`,
  );
}

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
  assertFontsCanRender(brand.id, css);

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
