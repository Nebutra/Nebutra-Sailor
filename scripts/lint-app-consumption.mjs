#!/usr/bin/env node
/**
 * Apps consume the design system the way the library does.
 *
 * lint-primitive-hygiene holds packages/design/ui to the design system's
 * words; this is the same bar for apps/**, where the 2026-09-26 audit found
 * 1,300+ sites speaking around it:
 *
 *   status-var-ink — text-[var(--status-danger)] and friends. --status-* are
 *                    fills for SVG and charts (bright: #22c55e, #ef4444); as
 *                    ink they fail contrast. Use text-{destructive,warning,
 *                    success}-strong. Zero tolerance.
 *   hsl-wrapped    — text-[hsl(var(--primary))] where text-primary exists.
 *                    Same pixels, but it bypasses the utility the theme
 *                    registers, so tooling (tailwind-merge, the pairing and
 *                    state-shift guards) cannot see it. Zero tolerance.
 *   bracket-scale  — bg-[var(--neutral-1)] where bg-neutral-1 is registered.
 *                    The 12-step scales are theme colours (--color-neutral-N,
 *                    --color-blue-N, --color-cyan-N); the long form hid 1,133
 *                    sites from tailwind-merge. Zero tolerance.
 *   palette        — Tailwind default-palette / fixed colours (bg-white,
 *                    text-gray-500, border-slate-200 …) that no Brand Package
 *                    or dark mode can restyle. The 903 found were migrated
 *                    the same day; governance.config.json →
 *                    appConsumption.allowlist is empty and stays that way.
 *
 * Exempt one line with `// allow-palette: <reason>` directly above it (colour
 * on arbitrary media, depicted third-party chrome, material colours).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { stripComments as blankSourceComments } from "./lib/strip-comments.mjs";

const ROOT = join(import.meta.dirname, "..");
const ALLOW = JSON.parse(readFileSync(join(ROOT, "governance.config.json"), "utf8")).appConsumption
  .allowlist;

const files = execFileSync(
  "git",
  [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    "apps/**/*.tsx",
    "apps/**/*.ts",
    "apps/**/*.css",
  ],
  {
    cwd: ROOT,
    encoding: "utf8",
  },
)
  .split("\n")
  // An unmerged file is listed once per stage; count it once.
  .filter((f, i, all) => all.indexOf(f) === i)
  .filter(
    (f) =>
      f &&
      !/(\.test\.|\.spec\.|__tests__|\.stories\.|global-error|\.d\.ts$|\/generated|\/og\/|opengraph-image|mail-preview\/src\/emails)/.test(
        f,
      ),
  );

const PALETTE =
  /(?<![\w-])(?:[\w-]+:)*(?:bg|text|border|fill|stroke|ring|from|to|via|outline|divide|shadow|placeholder|caret|decoration)-(?:(?:gray|zinc|slate|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|neutral)-(?:50|[1-9]00|950)|white|black)(?:\/\d+)?(?![\w-])/g;
const STATUS_INK =
  /(?:text|fill|stroke)-\[(?:color:)?var\(--status-(?:danger|warning|success)\)\]/g;
const HSL_WRAPPED =
  /(?<![\w-])(?:bg|text|border|fill|stroke|ring|outline|decoration|divide|accent|placeholder|caret)-\[hsl\(var\(--[a-z0-9-]+\)(?:\s*\/\s*[\d.]+)?\)\]/g;

const BRACKET_SCALE =
  /(?<![\w-])(?:bg|text|border(?:-[trblxyse])?|ring|ring-offset|fill|stroke|from|to|via|outline|divide|decoration|placeholder|caret|accent)-\[(?:color:)?var\(--(?:neutral|blue|cyan)-(?:1[0-2]|[1-9])\)\]/g;

function strip(src) {
  return blankSourceComments(src);
}

const problems = [];
const seen = new Set();
for (const rel of files) {
  const raw = readFileSync(join(ROOT, rel), "utf8").split("\n");
  const kept = raw.filter((_, i) => !/allow-palette:\s*\S/.test(raw[i - 1] ?? ""));
  const code = strip(kept.join("\n"));
  const ink = (code.match(STATUS_INK) ?? []).length;
  const hsl = (code.match(HSL_WRAPPED) ?? []).length;
  const palette = (code.match(PALETTE) ?? []).length;
  const bracket = (code.match(BRACKET_SCALE) ?? []).length;
  if (ink)
    problems.push(
      `${rel}: ${ink} status fill(s) used as ink — text-{destructive,warning,success}-strong`,
    );
  if (hsl)
    problems.push(
      `${rel}: ${hsl} hsl(var(--x)) arbitrary value(s) where a utility exists — use it`,
    );
  if (bracket)
    problems.push(
      `${rel}: ${bracket} bracketed 12-step token(s) — write bg-neutral-1, not bg-[var(--neutral-1)]`,
    );
  const cap = ALLOW[rel];
  if (cap !== undefined) seen.add(rel);
  if (palette > (cap ?? 0))
    problems.push(
      cap === undefined
        ? `${rel}: ${palette} raw palette class(es) — use semantic tokens (bg-background, text-muted-foreground, border-border …)`
        : `${rel}: palette ${palette}, allowlist says ${cap} — it may only shrink`,
    );
  else if (cap !== undefined && palette < cap)
    problems.push(
      palette === 0
        ? `${rel}: clean — delete its appConsumption.allowlist entry`
        : `${rel}: palette down to ${palette} — ratchet its allowlist entry from ${cap} to ${palette}`,
    );
}
for (const rel of Object.keys(ALLOW)) {
  if (!seen.has(rel)) problems.push(`${rel}: allowlisted but gone — delete the entry`);
}

if (problems.length) {
  console.error("❌ app consumption — apps use the design system's words:");
  for (const p of problems) console.error(`   ${p}`);
  process.exit(1);
}
const left = Object.values(ALLOW).reduce((s, n) => s + n, 0);
console.log(
  `✓ app-consumption: ${Object.keys(ALLOW).length} file(s), ${left} known palette class(es), 0 new. Shrink on-touch.`,
);
