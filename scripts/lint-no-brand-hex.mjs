#!/usr/bin/env node

// CI guard: keep the brand identity out of component surfaces, in every form
// the codebase actually writes it. Scans apps/** AND packages/design/**.
//
// This guard owns TWO rule families:
//
// [brand-hex]  Hardcoded brand/status hex. Canonical replacements (CLAUDE.md):
//   #0033FE → bg-primary / hsl(var(--primary))   #0BF1C3 → var(--brand-accent)
//   #8b5cf6 → var(--brand-tertiary)              #ef4444 → var(--status-danger)
//   #f59e0b → var(--status-warning)              #10b981 → var(--status-success)
//
// [identity-var]  The VI identity lock reaching a component surface through a
//   variable instead of a literal: var(--blue-9) and its alias
//   var(--brand-primary). --blue-9 is #0033FE at OKLCH C=0.290 / L*48.4 — 23%
//   more chroma than the most saturated primary any comparable product ships,
//   and white on it hits 7.23:1 where that field sits at 4.5–5.2. CLAUDE.md
//   says it must not surface on components; on 2026-07-30 it was surfacing 31
//   times across 17 files, the sign-in / sign-up / phone-login buttons among
//   them, because this guard only looked for the hex and only looked at apps/**.
//
//   Component surfaces use the action blue: `bg-primary` where a Tailwind
//   utility can wrap the bare HSL channels, and `hsl(var(--primary))` in any
//   position that takes a raw colour — an SVG fill=, a color-mix() argument, a
//   box-shadow. Handing a bare-channel var to a slot that wants a colour
//   silently discards the whole declaration, which is why the two forms differ.
//
// Scope note: until 2026-07-30 this guard ripgrepped `apps` only, so the rule
// whose entire purpose is the identity lock on component surfaces had never
// looked at the component library. packages/design is now scanned. Mirrors the
// 2026-07-28 widening of scripts/lint-no-focus-rings.mjs.
//
// Structural exemptions (a category, not a debt list) — see EXEMPT_PATH:
//   stories, tests, brand/token SSOT, design-tool serializers, docs demos,
//   build scripts, SVG/public assets, email HTML, hex-input tooling,
//   global-error.tsx (renders outside the root layout; no CSS vars).
//
// Shrink-only allowlist: governance.config.json → brandHex.allowlist. Existing
// offenders only; the list may shrink, never grow. A file that no longer
// violates FAILS as a stale entry, so a fixed offender cannot leave its
// exemption behind (same shape as tests/architecture/doc-claims-drift.test.ts).
//
// Per-line escape hatch: // @allow-brand-hex: <reason>
//
// Run: node scripts/lint-no-brand-hex.mjs

import { readFileSync } from "node:fs";
import { findFiles, grepExcludes, toEre } from "./lib/scan.mjs";

const SCAN_ROOTS = ["apps", "packages/design"];

const RULES = [
  {
    id: "brand-hex",
    // Kept as one alternation so the ripgrep prefilter and the per-line test
    // cannot drift apart.
    source:
      "#(?:0033[Ff][Ee]|0[Bb][Ff]1[Cc]3|8[Bb]5[Cc][Ff]6|[Ee][Ff]4444|[Ff]59[Ee]0[Bb]|10[Bb]981)\\b",
    label: "hardcoded brand/status hex",
  },
  {
    id: "identity-var",
    // Matches anywhere on the line, so every position the codebase uses is
    // covered by construction: bg-[var(--blue-9)], text-[var(--brand-primary)],
    // accent-[var(--blue-9)], fill="var(--blue-9)", stroke="…", and
    // color-mix(in srgb, var(--blue-9) 18%, transparent).
    source: "var\\(--(?:blue-9|brand-primary)\\)",
    label: "VI identity lock on a component surface",
  },
];

const RULE_RE = new Map(RULES.map((r) => [r.id, new RegExp(r.source)]));
const PREFILTER = RULES.map((r) => r.source).join("|");

const EXEMPT_PATH = [
  // ── Structural: showing the raw scale IS the point ──────────────────────
  /\.stories\.tsx?$/,
  /\.test\.tsx?$/,
  /\/__tests__\//,
  /-demos?\.tsx$/, // docs/registry demo surfaces that render the literal
  /theme-playground\//,
  /content\/docs\//, // mdx token docs may print the literal

  // ── Structural: the token / brand SSOT defines the hex ───────────────────
  /^packages\/design\/brand\/src\//,
  /^packages\/design\/ui\/src\/tokens\//,
  /^packages\/design\/ui\/src\/theme\/tokens\.ts$/,
  /^packages\/design\/ui\/src\/tailwind\.preset\.ts$/,
  /^packages\/design\/ui\/src\/utils\/brand-colors\.ts$/,
  // design-md / DTCG / preview-HTML serialization: the wire format is hex.
  /^packages\/design\/design-sync\//,
  // Build tooling, not a rendered surface (build-registry asserts the mapping).
  /\/scripts\//,

  // ── Structural: no CSS variables available at render time ───────────────
  /\.svg$/i,
  /\/public\//,
  /global-error\.tsx$/,
  /mail-preview\/scripts\/export\.ts$/,
  /\/api\/og\//,
  /\/api\/changelog\/webhook\//, // email HTML body

  // ── Structural: the domain IS hex input ─────────────────────────────────
  /appearance\/(?:color-picker-row|accent-swatch-picker)\.tsx$/,
  /forge\/src\/components\/(?:catalog-runners|p0-runners)\.tsx$/,
];

const isExemptPath = (p) => EXEMPT_PATH.some((re) => re.test(p));

/** @returns {string[]} shrink-only allowlist of existing offender paths. */
function loadAllowlist() {
  try {
    const cfg = JSON.parse(readFileSync("governance.config.json", "utf-8"));
    return cfg.brandHex?.allowlist ?? [];
  } catch {
    return [];
  }
}

const allowlist = loadAllowlist();
const allowSet = new Set(allowlist);

const candidates = findFiles({
  label: "lint-no-brand-hex",
  rgCommand:
    "rg -l --glob '*.{tsx,ts,jsx,js}' --glob '!**/node_modules/**' " +
    "--glob '!**/.next/**' --glob '!**/.open-next/**' --glob '!**/.turbo/**' " +
    "--glob '!**/dist/**' --glob '!**/storybook-static/**' --glob '!**/.deploy/**' " +
    `${JSON.stringify(PREFILTER)} ${SCAN_ROOTS.join(" ")}`,
  grepCommand:
    `grep -rlE ${JSON.stringify(toEre(PREFILTER))} ` +
    "--include='*.tsx' --include='*.ts' --include='*.jsx' --include='*.js' " +
    `${grepExcludes()} ${SCAN_ROOTS.join(" ")}`,
});
const scanned = candidates.filter((f) => !isExemptPath(f));

const violations = [];
/** Allowlisted files that actually still violate — used to detect stale entries. */
const stillOffending = new Set();

for (const file of scanned) {
  const lines = readFileSync(file, "utf-8").split("\n");
  lines.forEach((line, i) => {
    const rule = RULES.find((r) => RULE_RE.get(r.id).test(line));
    if (!rule) return;
    if (/@allow-brand-hex:/.test(line) || /@allow-brand-hex:/.test(lines[i - 1] ?? "")) return;
    // A comment paints nothing, so it cannot put the brand on a surface —
    // which is the only thing this guard exists to prevent.
    //
    // This used to also require the line to carry `→`, `var(--`, `brand` or
    // `status`, which recognised a one-line mapping table and nothing else. A
    // paragraph explaining why a token moved got flagged on whichever line the
    // hex happened to land, and the cheapest way out was to reword the sentence
    // until the regex was happy. A guard that edits prose to suit itself is
    // worse than no guard.
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    if (allowSet.has(file)) {
      stillOffending.add(file);
      return;
    }
    violations.push({ file, line: i + 1, rule: rule.id, text: line.trim().slice(0, 200) });
  });
}

const stale = allowlist.filter((f) => !stillOffending.has(f));

if (violations.length === 0 && stale.length === 0) {
  process.stdout.write(
    `✅ lint-no-brand-hex: identity lock holds across ${SCAN_ROOTS.map((r) => `${r}/**`).join(" + ")} ` +
      `(${scanned.length} candidate file(s) read, ${allowlist.length} allowlisted).\n`,
  );
  process.exit(0);
}

if (violations.length > 0) {
  process.stderr.write(`\n❌ lint-no-brand-hex: ${violations.length} violation(s)\n\n`);
  for (const v of violations) {
    process.stderr.write(`  ${v.file}:${v.line}  [${v.rule}]\n    ${v.text}\n`);
  }
  process.stderr.write(
    "\nFix — [brand-hex]:\n" +
      "  #0033FE → bg-primary / hsl(var(--primary))   #0BF1C3 → var(--brand-accent)\n" +
      "  #8b5cf6 → var(--brand-tertiary)              #ef4444 → var(--status-danger)\n" +
      "  #f59e0b → var(--status-warning)              #10b981 → var(--status-success)\n" +
      "Fix — [identity-var]:\n" +
      "  var(--blue-9) / var(--brand-primary) are the VI identity lock (C=0.290).\n" +
      "  Component surfaces use the action blue instead:\n" +
      "    className: bg-[var(--blue-9)]                  → bg-primary\n" +
      '    raw slot:  fill="var(--blue-9)"                 → fill="hsl(var(--primary))"\n' +
      "    color-mix: color-mix(…, var(--blue-9) 18%, …)  → color-mix(…, hsl(var(--primary)) 18%, …)\n" +
      "  --primary holds BARE HSL CHANNELS: a slot that wants a colour must get\n" +
      "  hsl(var(--primary)), or the whole declaration is silently discarded.\n" +
      "Escape hatch: // @allow-brand-hex: <reason> on the line or the line above.\n\n",
  );
}

if (stale.length > 0) {
  process.stderr.write(
    `\n❌ lint-no-brand-hex: ${stale.length} STALE allowlist entry(ies) in governance.config.json → brandHex.allowlist.\n` +
      `   These files no longer violate. Delete the entry — the allowlist may only shrink,\n` +
      `   and a fixed offender must not keep its exemption:\n\n`,
  );
  for (const f of stale) process.stderr.write(`  ${f}\n`);
  process.stderr.write("\n");
}

process.exit(1);
