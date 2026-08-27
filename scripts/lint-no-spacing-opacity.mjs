#!/usr/bin/env node

// CI guard: fail when a Tailwind spacing utility (p/m/gap/space/inset) has an
// opacity modifier appended (`p-4/[0.04]`, `pt-6/[0.06]`, `gap-3/[0.2]`, etc).
//
// Why this is a bug:
//   Tailwind only recognizes `/<opacity>` on COLOR utilities (bg-X, text-X,
//   border-X, ring-X, fill-X). Spacing utilities accept no opacity modifier.
//   Tailwind v4 silently DROPS the entire class when it doesn't match a known
//   variant. The element gets ZERO padding/margin/gap with no warning.
//   The hand-written className LOOKS plausible, but the layout is broken.
//
//   Recurring source: regex-based "dark mode override" sweeps that intend to
//   target `bg-*` or `border-*` but accidentally match adjacent `p-*` tokens.
//
// Run: node scripts/lint-no-spacing-opacity.mjs
// Exit 1 on any violation. Wired into turbo lint pipeline.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const WHITELIST = [/\.test\.tsx?$/, /\/__tests__\//, /\.stories\.tsx?$/];

const isWhitelisted = (path) => WHITELIST.some((re) => re.test(path));

// Pattern: spacing utility name + numeric scale + /[opacity].
// p, pt, pr, pb, pl, px, py — padding
// m, mt, mr, mb, ml, mx, my — margin
// gap, gap-x, gap-y          — flex/grid gap
// space-x, space-y           — divider spacing
// inset, top/right/bottom/left, inset-x, inset-y — positioning
// w, h, min-w, min-h, max-w, max-h — sizing (also invalid with /opacity)
const BAD_RE =
  /\b(?:p[tlrbxy]?|m[tlrbxy]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|w|h|min-w|min-h|max-w|max-h|rounded(?:-[trbl]{1,2})?)-(?:[0-9.]+|\[[^\]]+\])\/\[/g;

// Scope: apps/ + packages/ (template-style code that ships UI patterns).
const filesRaw = execSync(
  `grep -rlE '/\\[' --include='*.tsx' --include='*.ts' apps packages 2>/dev/null | grep -v node_modules | grep -v dist/ | grep -v build/ | grep -v '/.next/'`,
  { encoding: "utf-8" },
).trim();
const files = filesRaw
  .split("\n")
  .filter(Boolean)
  .filter((f) => !isWhitelisted(f));

const violations = [];

for (const file of files) {
  const src = readFileSync(file, "utf-8");
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = line.matchAll(BAD_RE);
    for (const m of matches) {
      violations.push({ file, line: i + 1, snippet: m[0] });
    }
  }
}

if (violations.length === 0) {
  process.stdout.write(`✅ No spacing/sizing utilities with bogus /opacity modifier.\n`);
  process.exit(0);
}

process.stderr.write(
  `\n❌ ${violations.length} Tailwind spacing-with-opacity violation(s) — Tailwind silently drops these classes, breaking layout:\n\n`,
);
for (const v of violations) {
  process.stderr.write(`  ${v.file}:${v.line}  \`${v.snippet}…\`\n`);
}
process.stderr.write(
  `\nFix: drop the \`/[<opacity>]\` suffix. Opacity only applies to color utilities (bg-*, text-*, border-*, ring-*).\n`,
);
process.stderr.write(`  Example:  \`pt-6/[0.06]\`  →  \`pt-6\`\n\n`);
process.exit(1);
