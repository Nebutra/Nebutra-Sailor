#!/usr/bin/env node
// Lint guard: forbid `dark:` Tailwind overrides that a token already handles —
// either because the token auto-flips via [data-theme="dark"], or because the
// pair was hand-written where the elevation ramp flips for free.
//
// Rules:
//   [dark-white-token]  dark:<chain>:(bg|text|border|fill|stroke|divide|ring|
//                       shadow)-white(/N)?
//   [dark-bg-neutral-12] dark:bg-neutral-12  ← invisible-popover bug (uses the
//                       TEXT colour as a background)
//   [dark-hand-paired-shadow]  dark:<chain>:shadow-[…] whose arbitrary value
//                       carries a literal white (rgba(255,255,255,…), #fff,
//                       hsl(0 0% 100%), `white`). Always half of a hand-written
//                       light/dark pair; --elevation-* is defined twice in
//                       packages/design/tokens/styles.css (light ~line 259, dark
//                       ~line 573) and flips on its own, so use a ramp utility
//                       (shadow-xs…2xl, shadow-ambient-*, shadow-glass-*, shadow-sheen).
//
// See packages/design/tokens/styles.css — neutral-*, brand and elevation scales
// auto-flip, so a manual dark override targeting `white` or the text-neutral-12
// token is redundant or buggy.
//
// Scope note: `shadow` was absent from the property alternation until
// 2026-07-30, so a hand-paired dark shadow walked straight through this guard.
// Adding it to the alternation alone closes only the `dark:shadow-white` token
// form (0 occurrences repo-wide) — the form the codebase actually writes is the
// arbitrary value, hence [dark-hand-paired-shadow].
//
// Shrink-only allowlist below (ALLOWLIST). Existing offenders only; the list may
// shrink, never grow. A `file:rule` entry that no longer violates FAILS as a
// stale entry, so a fixed offender cannot leave its exemption behind.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Scope: the directories swept by scripts/sweep-dark-overrides.mjs.
// Other apps (sailor-docs, etc.) carry legacy drift
// that predates this audit and is tracked separately.
const ROOTS = ["apps/web/src", "apps/landing/src", "packages/design"];

/** `dark:` plus any number of chained variants (hover:, group-hover:, md:, …). */
const DARK_CHAIN = String.raw`\bdark:(?:[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)?:)*`;

const RULES = [
  {
    id: "dark-white-token",
    re: new RegExp(
      `${DARK_CHAIN}(?:bg|text|border|fill|stroke|divide|ring|shadow)-white(?:\\/(?:\\d+|\\[[^\\]\\s"']+\\]))?\\b`,
    ),
    fix: 'remove the `dark:` variant — the token already flips via [data-theme="dark"].',
  },
  {
    id: "dark-bg-neutral-12",
    re: /\bdark:bg-neutral-12\b(?!\/)/,
    fix: "neutral-12 is the TEXT colour; use bg-neutral-1/2 (they auto-flip).",
  },
  {
    id: "dark-hand-paired-shadow",
    re: new RegExp(
      `${DARK_CHAIN}shadow-\\[[^\\]]*(?:rgba?\\(\\s*255\\s*,\\s*255\\s*,\\s*255|#[Ff]{3,4}\\b|#[Ff]{6}\\b|\\bwhite\\b|hsl\\(0\\s+0%\\s+100%)`,
    ),
    fix: "use a ramp utility (shadow-xs…2xl / shadow-ambient-* / shadow-glass-* / shadow-sheen) — each --shadow-* alias reads --elevation-*, which is redefined for dark and flips on its own. NOTE there is no `shadow-elevation-*` utility; apps/landing already carries three dead `shadow-elevation-high` classes.",
  },
];

const EXCLUDE_FILES = new Set([
  "scripts/sweep-dark-overrides.mjs",
  "scripts/lint-no-dark-overrides.mjs",
]);

const EXEMPT_PATH = [/\.stories\.tsx?$/, /\.test\.tsx?$/, /\/__tests__\//];

/**
 * Shrink-only allowlist of pre-existing offenders, `<file>:<rule-id>`, sorted
 * and grouped by file. Measured 2026-07-30 when `shadow` entered the guard.
 * Migrate on touch (swap the hand-paired pair for a shadow-* ramp utility), then
 * delete the entry — the guard fails on a stale one.
 */
const ALLOWLIST = [
  "apps/web/src/app/(app)/settings/shortcuts/page.tsx:dark-hand-paired-shadow",
  "apps/web/src/components/command-palette/command-mode-context.tsx:dark-hand-paired-shadow",
];

const allowSet = new Set(ALLOWLIST);

const files = execSync(
  `find ${ROOTS.join(" ")} -type f \\( -name '*.tsx' -o -name '*.ts' -o -name '*.jsx' -o -name '*.js' \\) ` +
    `-not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/.next/*' ` +
    `-not -path '*/.open-next/*' -not -path '*/.turbo/*' -not -path '*/build/*' ` +
    `-not -path '*/storybook-static/*' -not -path '*/.deploy/*'`,
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
)
  .split("\n")
  .filter(Boolean);

const violations = [];
const stillOffending = new Set();

for (const file of files) {
  if (EXCLUDE_FILES.has(file)) continue;
  if (EXEMPT_PATH.some((re) => re.test(file))) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, idx) => {
    for (const rule of RULES) {
      if (!rule.re.test(line)) continue;
      const key = `${file}:${rule.id}`;
      if (allowSet.has(key)) {
        stillOffending.add(key);
        break;
      }
      violations.push({
        file,
        lineNum: idx + 1,
        rule: rule.id,
        fix: rule.fix,
        line: line.trim().slice(0, 200),
      });
      break;
    }
  });
}

const stale = ALLOWLIST.filter((k) => !stillOffending.has(k));

if (violations.length === 0 && stale.length === 0) {
  process.stdout.write(
    `✓ lint-no-dark-overrides: no redundant 'dark:' overrides ` +
      `(scanned ${files.length} files across ${ROOTS.join(", ")}; ${ALLOWLIST.length} allowlisted).\n`,
  );
  process.exit(0);
}

if (violations.length > 0) {
  process.stderr.write(
    `\n✗ lint-no-dark-overrides: ${violations.length} redundant 'dark:' override(s)\n\n`,
  );
  for (const v of violations.slice(0, 50)) {
    process.stderr.write(`  ${v.file}:${v.lineNum}  [${v.rule}]\n    ${v.line}\n    → ${v.fix}\n`);
  }
  if (violations.length > 50) {
    process.stderr.write(`  ... and ${violations.length - 50} more.\n`);
  }
  process.stderr.write(
    `\nThese tokens (neutral-*, white, --elevation-*) already flip under [data-theme="dark"].\n` +
      `  See packages/design/tokens/styles.css.\n\n`,
  );
}

if (stale.length > 0) {
  process.stderr.write(
    `\n✗ lint-no-dark-overrides: ${stale.length} STALE ALLOWLIST entry(ies) in scripts/lint-no-dark-overrides.mjs.\n` +
      `   These no longer violate. Delete them — the allowlist may only shrink:\n\n`,
  );
  for (const k of stale) process.stderr.write(`  ${k}\n`);
  process.stderr.write("\n");
}

process.exit(1);
