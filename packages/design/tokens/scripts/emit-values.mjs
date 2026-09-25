#!/usr/bin/env node
/**
 * values.generated.ts — the token values, read from the stylesheet apps consume.
 *
 * Display surfaces (Storybook, the docs demos, brand guidelines, OG images,
 * the DESIGN.md preview) used to restate token values by hand: a font stack
 * copied into primitive.ts, a palette copied into brand-override.css, each
 * commented "aligned with SSOT" and each drifting on the next change. This
 * module is what they read instead. It is parsed out of styles.css — the exact
 * file every app imports — so what a page shows and what a page renders are
 * the same bytes, not two copies kept in step by a verifier.
 *
 * Only the base blocks are read: top-level `:root` (light) and `.dark`. The
 * @supports upgrades (Display-P3, OKLCH) are progressive enhancements of values
 * already present in the base; @theme inline is Tailwind's mapping, not a value.
 *
 *   node scripts/emit-values.mjs          write src/values.generated.ts
 *   node scripts/emit-values.mjs --check  exit 1 if the committed file is stale
 */
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { formatGenerated } from "./format-generated.mjs";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STYLES = resolve(PKG, "styles.css");
const OUT = resolve(PKG, "src", "values.generated.ts");

/** Top-level rule blocks as [selector, body], comments removed. */
function topLevelBlocks(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = [];
  let depth = 0;
  let start = 0;
  let selectorStart = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "{") {
      if (depth === 0) {
        start = i + 1;
        blocks.push({ selector: src.slice(selectorStart, i).trim(), start });
      }
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) {
        blocks[blocks.length - 1].body = src.slice(start, i);
        selectorStart = i + 1;
      }
    } else if (depth === 0 && c === ";") {
      selectorStart = i + 1; // @import / @charset statements
    }
  }
  return blocks;
}

function declarations(body) {
  const out = [];
  // Values may span lines and contain parentheses with semicolons never inside.
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]*);/g)) {
    out.push([
      m[1],
      m[2].replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim(),
    ]);
  }
  return out;
}

export function extractValues(css) {
  const values = new Map();
  for (const { selector, body } of topLevelBlocks(css)) {
    const mode = selector === ":root" ? "light" : selector === ".dark" ? "dark" : null;
    if (!mode || body === undefined) continue;
    for (const [name, value] of declarations(body)) {
      const entry = values.get(name) ?? {};
      entry[mode] = value;
      values.set(name, entry);
    }
  }
  // A dark block that restates the light value is not an override.
  for (const entry of values.values()) {
    if (entry.dark !== undefined && entry.dark === entry.light) delete entry.dark;
  }
  return new Map([...values].sort(([a], [b]) => a.localeCompare(b)));
}

function render(values) {
  const rows = [...values].map(([name, modes]) => {
    const parts = Object.entries(modes).map(([m, v]) => `${m}: ${JSON.stringify(v)}`);
    return `  ${JSON.stringify(name)}: { ${parts.join(", ")} },`;
  });
  return `/**
 * GENERATED FILE, DO NOT EDIT.
 * Written by packages/design/tokens/scripts/emit-values.mjs from styles.css —
 * the stylesheet apps import — so a value shown anywhere is the value rendered.
 * Edit packages/design/design-tokens/tokens/*.json and rebuild.
 *
 * Keyed by CSS custom property. \`dark\` is present only where the dark block
 * overrides the light value. Read it through ./values.ts, not directly.
 */

export const TOKEN_VALUES = {
${rows.join("\n")}
} as const satisfies Record<string, { light?: string; dark?: string }>;
`;
}

/** Render, then Biome-format, so the bytes are what the committed file must be. */
function formatted(target, content) {
  writeFileSync(target, content);
  formatGenerated(target);
  return readFileSync(target, "utf8");
}

function main() {
  const next = render(extractValues(readFileSync(STYLES, "utf8")));
  if (process.argv.includes("--check")) {
    const probe = OUT.replace(/\.ts$/, ".check.tmp.ts");
    let expected;
    try {
      expected = formatted(probe, next);
    } finally {
      rmSync(probe, { force: true });
    }
    let current = "";
    try {
      current = readFileSync(OUT, "utf8");
    } catch {}
    if (current !== expected) {
      process.stderr.write(
        "✗ packages/design/tokens/src/values.generated.ts is stale — run `node packages/design/tokens/scripts/emit-values.mjs`\n",
      );
      process.exit(1);
    }
    process.stdout.write("✓ values.generated.ts matches styles.css\n");
  } else {
    const written = formatted(OUT, next);
    process.stdout.write(`values.generated.ts: ${written.split("\n").length} lines\n`);
  }
}

// Imported by the tests for extractValues(); only a direct run writes.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
