#!/usr/bin/env node

// CI guard: every var(--x) referenced in component code must actually be DEFINED.
//
// Why this exists: on 2026-07-28 the marketing Hero styled its primary CTA with
// bg-[var(--brand-9)]. That custom property does not exist — the real 12-step
// scale is --blue-*, with --brand-primary as an alias. An undefined custom
// property inside a Tailwind arbitrary value computes to rgba(0,0,0,0), so the
// button shipped as white text on a transparent background: invisible. 29 such
// references sat across 5 files, two of them authenticated product pages.
//
// Every other token guard checks for FORBIDDEN values (hardcoded hex,
// max-w-5xl, lucide imports). None checked that a referenced property resolves.
// A misspelled token is silently transparent, which reads as a styling choice
// rather than an error — the worst failure mode a design system can have.
//
// Run: node scripts/lint-defined-css-vars.mjs
// Exit 1 on any reference to an undefined custom property.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Trees whose code is governed. */
const SCAN_ROOTS = ["apps", "packages/design", "backends/gateway"];

/** Every stylesheet that may define a custom property. */
const DEFINITION_GLOBS = ["packages/design", "apps"];

/**
 * Properties supplied by something other than our own stylesheets, so an
 * absent definition is expected rather than a bug.
 */
const EXTERNAL_PREFIXES = [
  "--tw-", // Tailwind internals
  "--color-", // Tailwind v4 theme namespace (--color-green-100 &c. are generated)
  "--font-", // next/font injects --font-geist-sans / --font-geist-mono at runtime
  "--spacing", // Tailwind v4 spacing scale
  "--radix-", // Radix positioning/animation vars
  "--reka-",
  "--motion-", // Motion / Framer
  "--swiper-",
  "--vis-", // visx / charts
  "--recharts-",
  "--shiki-", // syntax highlighting themes
  "--fd-", // fumadocs, injected by its own CSS in the docs apps
  "--sb-", // Storybook
  "--embla-",
  "--sonner-",
  "--cmdk-",
  "--nextra-",
];

/**
 * Properties a component sets at runtime rather than in a stylesheet — an inline
 * style object, a styled `--x: value` in a template literal, or setProperty().
 *
 * These are collected across the whole scanned tree, not per file: a shared
 * class-name constant may reference a property that its sibling component sets
 * inline. primitives/form-control.ts reads --input-focus-ring-width, which
 * primitives/input.tsx supplies through a style object.
 */
const RUNTIME_DEFINITION_RE =
  /["'`](--[a-zA-Z0-9-]+)["'`]\s*:|setProperty\(\s*["'`](--[a-zA-Z0-9-]+)["'`]|(?:^|[;{\s])(--[a-zA-Z0-9-]+)\s*:\s*[^;\n]|\[(--[a-zA-Z0-9-]+):/gm;

/**
 * Bare references only. `var(--x, fallback)` degrades gracefully and is not a
 * defect — the badge variants rely on exactly that to fall back from a semantic
 * token to a Tailwind default. Only `var(--x)` with no fallback goes
 * transparent when the property is missing.
 */
const REFERENCE_RE = /var\(\s*(--[a-zA-Z0-9-]+)\s*\)/g;

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch {
    return "";
  }
}

// ── 1. Collect every defined custom property from our stylesheets ──────────────

const cssFiles = sh(
  `rg -l --glob '*.css' --glob '!**/node_modules/**' --glob '!**/dist/**' ` +
    `--glob '!**/.next/**' --glob '!**/.open-next/**' --glob '!**/.turbo/**' ` +
    `-- '^\\s*--[a-zA-Z0-9-]+\\s*:' ${DEFINITION_GLOBS.join(" ")}`,
)
  .split("\n")
  .filter(Boolean);

const defined = new Set();
for (const file of cssFiles) {
  const src = readFileSync(file, "utf-8");
  for (const m of src.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:/gm)) defined.add(m[1]);
  // @theme blocks and inline style objects can also introduce properties.
  for (const m of src.matchAll(/\s(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(m[1]);
}

if (defined.size === 0) {
  process.stderr.write(
    "❌ Found no custom-property definitions at all — the guard cannot be trusted.\n" +
      "   Check DEFINITION_GLOBS in scripts/lint-defined-css-vars.mjs.\n",
  );
  process.exit(1);
}

// ── 2. Check every reference in component code ────────────────────────────────

const codeFiles = sh(
  `rg -l --glob '*.{ts,tsx}' --glob '!*.d.ts' --glob '!**/node_modules/**' ` +
    `--glob '!**/dist/**' --glob '!**/.next/**' --glob '!**/.open-next/**' ` +
    `--glob '!**/.turbo/**' --glob '!**/generated/**' ` +
    `-- 'var\\(--' ${SCAN_ROOTS.join(" ")}`,
)
  .split("\n")
  .filter(Boolean);

const isExternal = (name) => EXTERNAL_PREFIXES.some((p) => name.startsWith(p));

// Properties supplied at runtime by component code, anywhere in the tree.
const runtimeDefined = new Set();
const sources = new Map();
for (const file of codeFiles) {
  const src = readFileSync(file, "utf-8");
  sources.set(file, src);
  for (const m of src.matchAll(RUNTIME_DEFINITION_RE)) {
    const name = m[1] ?? m[2] ?? m[3] ?? m[4];
    if (name) runtimeDefined.add(name);
  }
}

const violations = [];

for (const [file, src] of sources) {
  src.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(REFERENCE_RE)) {
      const name = m[1];
      if (isExternal(name) || defined.has(name) || runtimeDefined.has(name)) continue;
      violations.push({ file, line: i + 1, name, text: line.trim().slice(0, 160) });
    }
  });
}

if (violations.length === 0) {
  process.stdout.write(
    `✅ Every var(--x) in ${SCAN_ROOTS.map((r) => `${r}/**`).join(" + ")} resolves ` +
      `(${defined.size} properties defined across ${cssFiles.length} stylesheets).\n`,
  );
  process.exit(0);
}

const byName = new Map();
for (const v of violations) {
  if (!byName.has(v.name)) byName.set(v.name, []);
  byName.get(v.name).push(v);
}

process.stderr.write(
  `\n❌ ${violations.length} reference(s) to ${byName.size} undefined custom propert${
    byName.size === 1 ? "y" : "ies"
  }.\n` +
    `   An undefined var() computes to transparent — it looks like a styling choice, not an error.\n\n`,
);

for (const [name, hits] of [...byName].sort((a, b) => b[1].length - a[1].length)) {
  process.stderr.write(`  ${name}  (${hits.length})\n`);
  for (const h of hits.slice(0, 6)) {
    process.stderr.write(`    ${h.file}:${h.line}\n      ${h.text}\n`);
  }
  if (hits.length > 6) process.stderr.write(`    … ${hits.length - 6} more\n`);
}

process.stderr.write(
  "\nFix: use a property that exists, or define it in packages/design/tokens/styles.css.\n" +
    "  If it comes from a third-party stylesheet, add its prefix to EXTERNAL_PREFIXES.\n\n",
);
process.exit(1);
