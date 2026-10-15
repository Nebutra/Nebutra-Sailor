#!/usr/bin/env node
/**
 * Typography is ONE pipeline: @nebutra/tokens loads the faces, the token
 * stacks name them, the base sheet applies them, and no app does any of it on
 * its own.
 *
 * The 2026-10-16 audit (docs/reports/2026-10-16-frontend-foundation-audit.md)
 * measured what happened while every app wired fonts by itself: the auth center
 * rendered in ui-sans-serif and the IdP in Times (their layouts never
 * applied the loader classes), the marketing site downloaded DM Sans twice, the design
 * site sent six design-language families to every visitor, and h1 shipped at
 * 400, 500 and 600 depending on the app. Four rules, each a different way that
 * returns:
 *
 *   loader         — `next/font/*`, `geist/font/*`, `@nebutra/fonts/next*`,
 *                    `@nebutra/fonts/font-face` imports and `@font-face` rules
 *                    outside packages/design/{tokens,fonts}. Zero tolerance;
 *                    exempt paths (independent products, a typeface catalog)
 *                    are listed in fontPipeline.loaderExempt with a reason.
 *   root-layout    — every app file under src/app that renders <html> imports
 *                    `@nebutra/tokens/fonts` and puts `fontClassName` on it.
 *                    Zero tolerance (global-error.tsx renders outside the app
 *                    CSS by design and is not a root layout).
 *   family-literal — a font-family written as a literal in apps/** (CSS
 *                    `font-family: "X"`, `fontFamily: "X"`, `font-['X']`).
 *                    A face is chosen by a token (var(--font-*)), never typed.
 *                    Shrink-only per-file allowlist.
 *   heading-weight — a weight utility on <h1>–<h3> (font-semibold, font-bold,
 *                    md:font-medium, font-[600] …). Heading weight is
 *                    core.json:fontWeight.heading, applied by the base sheet and
 *                    retuned by a Brand Package — not an app decision.
 *                    Shrink-only per-file allowlist.
 *
 * governance.config.json → fontPipeline:
 *   loaderExempt    { path-prefix: reason }
 *   familyLiteral   [{ file, count }]   shrink-only
 *   headingWeight   [{ file, count }]   shrink-only
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { openingTags } from "./lib/jsx-count-ratchet.mjs";
import { stripComments } from "./lib/strip-comments.mjs";

const ROOT = join(import.meta.dirname, "..");
const config = JSON.parse(readFileSync(join(ROOT, "governance.config.json"), "utf8")).fontPipeline;
if (!config) {
  console.error("❌ governance.config.json is missing the fontPipeline section");
  process.exit(1);
}

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".open-next",
  ".turbo",
  ".source",
  "storybook-static",
  "coverage",
  "__tests__",
]);
const SOURCE = /\.(tsx?|jsx?|mjs|css)$/;
const TEST = /\.(test|spec|stories)\.[jt]sx?$/;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith(".") && entry.name !== ".storybook") continue;
      yield* walk(join(dir, entry.name));
    } else if (SOURCE.test(entry.name) && !TEST.test(entry.name)) {
      yield relative(ROOT, join(dir, entry.name));
    }
  }
}

const files = [...walk(join(ROOT, "apps")), ...walk(join(ROOT, "packages"))];
if (files.length < 500) {
  // A guard that reads nothing reports clean on everything.
  console.error(`❌ font-pipeline read only ${files.length} files — refusing to report clean`);
  process.exit(1);
}

const LOADER_HOME = /^packages\/design\/(tokens|fonts)\//;
const exempt = (rel) => Object.keys(config.loaderExempt).some((prefix) => rel.startsWith(prefix));

const LOADER_IMPORT =
  /(?:from\s*|import\s*\(?\s*)["'](next\/font\/[\w/-]+|geist\/font\/[\w/-]+|@nebutra\/fonts\/(?:next(?:\/cjk)?|font-face))["']/g;
const FONT_FACE = /@font-face\b/g;

// A literal family: anything that does not start with var(, inherit, initial,
// unset or a CSS-wide keyword. Template and string literals in TS both count.
const CSS_FAMILY =
  /font-family\s*:\s*(?!\s*(?:var\(|inherit\b|initial\b|unset\b|revert\b))[^;}{]+/g;
const TS_FAMILY =
  /fontFamily\s*:\s*(["'`])(?!\s*(?:var\(|inherit\b|initial\b|unset\b))(?:(?!\1)[^\n])+\1/g;
const TW_FAMILY = /(?:^|[\s"'`])(?:[\w-]+:)*!?font-\[(?!\s*(?:var\(|\d))[^\]]+\]/g;

const HEADING_WEIGHT =
  /(^|[\s"'`{(])((?:[\w-]+:)*!?font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\]))(?=[\s"'`})]|$)/g;

const problems = [];
const familyCounts = new Map();
const headingCounts = new Map();

for (const rel of files) {
  const raw = readFileSync(join(ROOT, rel), "utf8");
  const src = stripComments(raw);

  // ── loader ────────────────────────────────────────────────────────────────
  if (!LOADER_HOME.test(rel) && !exempt(rel)) {
    for (const m of src.matchAll(LOADER_IMPORT))
      problems.push(
        `${rel}: imports ${m[1]} — load fonts through @nebutra/tokens/fonts (Next) or @nebutra/tokens/fonts.css`,
      );
    if (FONT_FACE.test(src))
      problems.push(`${rel}: declares @font-face — faces are declared once, in @nebutra/tokens`);
    FONT_FACE.lastIndex = 0;
  }

  if (!rel.startsWith("apps/") || exempt(rel)) continue;

  // ── root-layout ───────────────────────────────────────────────────────────
  if (
    /\/src\/app\/.*\.tsx$/.test(rel) &&
    !rel.endsWith("/global-error.tsx") &&
    /<html[\s>]/.test(src)
  ) {
    if (!/from\s*["']@nebutra\/tokens\/fonts["']/.test(src) || !/\bfontClassName\b/.test(src))
      problems.push(
        `${rel}: renders <html> without fontClassName from @nebutra/tokens/fonts — the page falls back to the OS face`,
      );
  }

  // ── family-literal ────────────────────────────────────────────────────────
  if (!rel.endsWith("/global-error.tsx")) {
    let n = 0;
    if (rel.endsWith(".css")) n += [...src.matchAll(CSS_FAMILY)].length;
    else n += [...src.matchAll(TS_FAMILY)].length + [...src.matchAll(TW_FAMILY)].length;
    if (n) familyCounts.set(rel, n);
  }

  // ── heading-weight ────────────────────────────────────────────────────────
  if (/\.(tsx|jsx)$/.test(rel)) {
    let n = 0;
    for (const { tag, attrs } of openingTags(src)) {
      if (!/^h[1-3]$/.test(tag)) continue;
      n += [...attrs.matchAll(HEADING_WEIGHT)].length;
    }
    if (n) headingCounts.set(rel, n);
  }
}

// heading-weight also governs the component library: a PageHeader that sets
// its own h1 weight overrides the ramp in every app at once.
for (const rel of files) {
  if (!rel.startsWith("packages/design/ui/src/") || !/\.tsx$/.test(rel)) continue;
  const src = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  let n = 0;
  for (const { tag, attrs } of openingTags(src)) {
    if (/^h[1-3]$/.test(tag)) n += [...attrs.matchAll(HEADING_WEIGHT)].length;
  }
  if (n) headingCounts.set(rel, n);
}

function ratchet(name, counts, allowlist, hint) {
  const allowed = new Map(allowlist.map((e) => [e.file, e.count]));
  for (const [file, n] of counts) {
    const limit = allowed.get(file) ?? 0;
    if (n > limit) problems.push(`${file}: ${n} ${name}, allowlist says ${limit} — ${hint}`);
    else if (n < limit)
      problems.push(`${file}: ${name} down to ${n} — ratchet its entry from ${limit} to ${n}`);
  }
  for (const [file, limit] of allowed) {
    if (!counts.has(file))
      problems.push(`${file}: allowlisted ${limit} ${name} but has none — delete the entry`);
  }
}

ratchet(
  "font-family literal(s)",
  familyCounts,
  config.familyLiteral,
  "name a token: var(--font-sans|heading|mono) or a font-* utility",
);
ratchet(
  "heading weight override(s)",
  headingCounts,
  config.headingWeight,
  "drop the weight; h1–h3 take --font-weight-heading from core.json",
);

if (problems.length) {
  console.error("❌ font pipeline — fonts are loaded, named and weighted in one place:");
  for (const p of problems) console.error(`   ${p}`);
  process.exit(1);
}
console.log(
  `✓ font-pipeline: ${files.length} files; ${config.familyLiteral.length} family-literal and ${config.headingWeight.length} heading-weight file(s) on the shrink-only lists.`,
);
