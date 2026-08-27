#!/usr/bin/env node
/**
 * Generate the specimen font loader from the catalog.
 *
 * Type Lens renders every specimen with the typeface's own `cssStack`, which is
 * a bare family name — `"EB Garamond", system-ui, sans-serif`. Nothing loaded
 * those families, so all 128 of them resolved to the one font the page did
 * load. Measured on the live site: seven different declared faces rendered the
 * same string at exactly 555px while system-ui came out at 576. Every specimen
 * on a type-specimen site was showing the same typeface, and the only reason it
 * was not obvious is that they were all wrong in the same direction — the PNG
 * of the real work sat next to a caption in the wrong face.
 *
 * Every entry in the catalog is OFL-1.1, so all of them may be self-hosted.
 * next/font/google downloads at build time and serves from our own origin, so
 * this adds no runtime request to Google and needs no CSP change — the same
 * contract as @nebutra/fonts.
 *
 * Generated rather than hand-written because the catalog is the source of
 * truth: a face added there must not need a second edit here to actually
 * render. Faces Google does not carry are emitted as an explicit
 * UNAVAILABLE_FACES list so the UI can say so instead of silently substituting.
 *
 * Run: node scripts/gen-catalog-fonts.mjs
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const repoRoot = resolve(appRoot, "..", "..");

const CATALOG = join(repoRoot, "packages/design/typelens-catalog/src/generated/fiu-catalog.json");
const OUT = join(appRoot, "src/lib/catalog-fonts.generated.ts");

/**
 * Catalog family → the name Google publishes it under.
 *
 * Only spelling, never substitution: `Jost*` is Jost with the foundry's
 * asterisk, `Fjalla` is Fjalla One. The two Source Han families are the one
 * judgement call — Google serves Adobe's pan-CJK design as Noto Sans/Serif SC,
 * which is the same typeface under Google's name for it.
 */
const ALIASES = {
  "Jost*": "Jost",
  Fjalla: "Fjalla One",
  Crimson: "Crimson Text",
  "Old Standard": "Old Standard TT",
  "Pacifico (Vernon Adams)": "Pacifico",
  "Averia Serif": "Averia Serif Libre",
  "Wix Madefor": "Wix Madefor Display",
  "Source Han Sans": "Noto Sans SC",
  "Source Han Serif": "Noto Serif SC",
  "Geist Sans": "Geist",
};

/** Which scripts each family needs, beyond latin. */
const SUBSETS = {
  "Noto Sans SC": ["latin"],
  "Noto Serif SC": ["latin"],
  "Noto Sans Arabic": ["arabic"],
  "Noto Nastaliq Urdu": ["arabic"],
  "Noto Serif Tibetan": ["tibetan"],
  "Noto Sans Vai": ["vai"],
  "Noto Sans Limbu": ["limbu"],
  "Noto Sans Warang Citi": ["warang-citi"],
  "Noto Sans Egyptian Hieroglyphs": ["egyptian-hieroglyphs"],
  "Noto Sans Symbols": ["symbols"],
  "Black Han Sans": ["latin"],
  "Kiwi Maru": ["latin"],
  "Hina Mincho": ["latin"],
  "Zen Antique": ["latin"],
  "Zen Kaku Gothic New": ["latin"],
};

const require = createRequire(import.meta.url);
function googleFamilies() {
  // Resolve through next itself so the list can never drift from the version
  // that will compile these calls.
  const nextMain = require.resolve("next", { paths: [appRoot] });
  let dir = dirname(nextMain);
  for (let i = 0; i < 6; i++) {
    const p = join(dir, "dist/compiled/@next/font/dist/google/font-data.json");
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf-8"));
    dir = dirname(dir);
  }
  throw new Error("could not locate next's google font-data.json");
}

const fontData = googleFamilies();
const catalog = JSON.parse(readFileSync(CATALOG, "utf-8"));

const typefaces = [];
(function walk(node) {
  if (Array.isArray(node)) return node.forEach(walk);
  if (node && typeof node === "object") {
    if (typeof node.cssStack === "string" && node.family) typefaces.push(node);
    else Object.values(node).forEach(walk);
  }
})(catalog);

/** `EB Garamond` → `ebGaramond`, unique and valid as an identifier. */
const ident = (s) =>
  s
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^[0-9]+/, "")
    .replace(/^./, (c) => c.toLowerCase());

const loaded = [];
const unavailable = [];
const seen = new Set();

for (const tf of typefaces.sort((a, b) => a.id.localeCompare(b.id))) {
  const googleName = ALIASES[tf.family] ?? tf.family;
  const entry = fontData[googleName];
  if (!entry) {
    unavailable.push(tf);
    continue;
  }
  if (seen.has(googleName)) {
    loaded.push({ ...tf, googleName, reuse: true });
    continue;
  }
  seen.add(googleName);

  const subsets = SUBSETS[googleName] ?? ["latin"];
  const available = new Set(entry.subsets ?? []);
  const useSubsets = subsets.filter((s) => available.has(s));
  if (useSubsets.length === 0) useSubsets.push((entry.subsets ?? ["latin"])[0]);

  // Variable fonts reject an explicit `weight`; static ones require one.
  const isVariable = Array.isArray(entry.axes) && entry.axes.length > 0;
  const weights = entry.weights ?? [];
  const weight = isVariable ? null : weights.includes("400") ? '"400"' : `"${weights[0] ?? "400"}"`;

  loaded.push({ ...tf, googleName, subsets: useSubsets, weight });
}

const lines = [];
lines.push("// GENERATED by scripts/gen-catalog-fonts.mjs — do not edit.");
lines.push("//");
lines.push("// One next/font/google call per typeface the catalog names and Google carries.");
lines.push("// Each downloads at build time and is served from this origin, so a specimen");
lines.push("// renders in its own face with no runtime request to Google and no CSP change.");
lines.push("//");
lines.push(
  `// ${loaded.length} of ${typefaces.length} faces load; the rest are listed as unavailable.`,
);
lines.push("");

const imports = [...seen].sort().map((n) => n.replace(/[^a-zA-Z0-9]/g, "_"));
lines.push(`import {\n${imports.map((i) => `  ${i},`).join("\n")}\n} from "next/font/google";`);
lines.push("");

for (const tf of loaded) {
  if (tf.reuse) continue;
  const fn = tf.googleName.replace(/[^a-zA-Z0-9]/g, "_");
  const v = ident(tf.id);
  const opts = [
    `subsets: [${tf.subsets.map((s) => `"${s}"`).join(", ")}]`,
    tf.weight ? `weight: ${tf.weight}` : null,
    `display: "swap"`,
    `variable: "--tl-face-${tf.id}"`,
  ].filter(Boolean);
  lines.push(`const ${v} = ${fn}({ ${opts.join(", ")} });`);
}
lines.push("");

lines.push("/** Every loaded face's `.variable` class. Apply once, on <html>. */");
lines.push("export const catalogFontClassName = [");
for (const tf of loaded) {
  if (tf.reuse) continue;
  lines.push(`  ${ident(tf.id)}.variable,`);
}
lines.push('].join(" ");');
lines.push("");

lines.push("/**");
lines.push(" * Typeface id → the CSS variable holding its self-hosted family.");
lines.push(" *");
lines.push(" * next/font reaches a face only through this variable; the bare family name in");
lines.push(" * `cssStack` matches nothing, which is why every specimen used to fall through");
lines.push(" * to the page font.");
lines.push(" */");
lines.push("export const CATALOG_FONT_VARS: Record<string, string> = {");
for (const tf of loaded) {
  const owner = tf.reuse ? loaded.find((x) => !x.reuse && x.googleName === tf.googleName) : tf;
  lines.push(`  "${tf.id}": "--tl-face-${owner.id}",`);
}
lines.push("};");
lines.push("");

lines.push("/**");
lines.push(" * Faces Google does not carry. Surfaces should say so rather than render them");
lines.push(" * in a substitute — a specimen showing the wrong typeface is worse than one");
lines.push(" * that admits it has nothing to show.");
lines.push(" */");
lines.push("export const UNAVAILABLE_FACES: ReadonlySet<string> = new Set([");
for (const tf of unavailable) lines.push(`  "${tf.id}", // ${tf.family}`);
lines.push("]);");
lines.push("");

lines.push("/** Prepend the self-hosted family so the declared stack can actually resolve. */");
lines.push("export function resolvedStack(id: string, cssStack: string): string {");
lines.push("  const v = CATALOG_FONT_VARS[id];");
lines.push("  return v ? `var(${v}), ${cssStack}` : cssStack;");
lines.push("}");
lines.push("");

writeFileSync(OUT, lines.join("\n"));
process.stdout.write(
  `gen-catalog-fonts: ${loaded.length}/${typefaces.length} faces load ` +
    `(${seen.size} distinct Google families), ${unavailable.length} unavailable\n` +
    (unavailable.length ? `  unavailable: ${unavailable.map((t) => t.family).join(", ")}\n` : ""),
);
