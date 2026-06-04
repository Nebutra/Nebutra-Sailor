#!/usr/bin/env node
// Sweep redundant `dark:` Tailwind overrides whose underlying token already
// flips with [data-theme="dark"]. See ADR / token source:
//   packages/design/tokens/styles.css — neutral-*, blue-*, etc. all auto-flip.
//
// Removes:
//   - dark:bg-neutral-12          ← invisible-popover bug (text color used as bg)
//   - dark:(bg|text|border|fill|stroke|divide|ring)-white(/\d+)?
//   - dark:(hover|focus|active|group-hover[/\w-]*|peer-hover|before|after):
//        (bg|text|border|fill|stroke|divide|ring)-white(/\d+)?
//
// Keeps every other `dark:` variant (visibility toggles, explicit color shifts,
// gradient stops, logo inversion, etc.) untouched.
//
// IMPORTANT: This script does NOT normalize whitespace inside quoted strings.
// It only removes the matched needle plus exactly one adjacent space (leading
// preferred, otherwise trailing). Let biome handle the rest.

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const ROOTS = ["apps/web/src", "apps/landing-page/src", "packages/design"];

const NEEDLES = [
  // dark:<chain>:<prop>-white(/N)?  — `\b` sits right after `white` (NOT after the
  // optional opacity) so a bracket opacity like `/[0.03]` is fully consumed. A
  // trailing `\b` would fail when `]` is followed by a space (both non-word),
  // backtracking to drop only `dark:bg-white` and orphaning `/[0.03]`.
  /\bdark:(?:[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)?:)*(?:bg|text|border|fill|stroke|divide|ring)-white\b(?:\/(?:\d+|\[[^\]\s"']+\]))?/g,
  // dark:bg-neutral-12 (the invisible-popover bug)
  /\bdark:bg-neutral-12\b(?!\/)/g,
];

const files = execSync(
  `find ${ROOTS.join(" ")} -type f \\( -name '*.tsx' -o -name '*.ts' -o -name '*.jsx' -o -name '*.js' \\) -not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/.next/*' -not -path '*/build/*'`,
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
)
  .split("\n")
  .filter(Boolean);

// Repair pass: orphan opacity fragments like `bg-neutral-1/[0.02]` or the
// spacing-glued `py-3/[0.03]` produced when an earlier (buggy) sweep didn't
// consume the bracket part of `dark:bg-white/[0.02]`. The needle above now
// consumes it fully, so new runs never create orphans — this pass only heals
// leftovers from older runs.
//   • color-scale tokens: HEAD has zero legitimate `<scale-N>/[fraction]`
//     (audited 2026-05-30).
//   • spacing/layout utilities (p-*, m-*, gap-*): never legitimately take an
//     opacity fraction, so any trailing `/[fraction]` is always an orphan.
const ORPHAN_BRACKET =
  /(\b(?:neutral|primary|secondary|background|foreground|muted|accent|destructive|sidebar|popover|card|ring|border|input)-\d+(?:\/\d+)?|\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-[0-9.]+)(?:\/\[[0-9.]+\])+/g;

let touched = 0;
let removed = 0;
const touchedFiles = [];

const SENTINEL = "__SWEEP_DROP__";

for (const file of files) {
  const before = readFileSync(file, "utf8");
  let after = before;

  for (const needle of NEEDLES) {
    after = after.replace(needle, SENTINEL);
  }

  const dropCount = (after.match(new RegExp(SENTINEL, "g")) || []).length;
  removed += dropCount;

  // Eat exactly one adjacent space: prefer leading, then trailing, then bare.
  after = after
    .replace(new RegExp(` ${SENTINEL}`, "g"), "")
    .replace(new RegExp(`${SENTINEL} `, "g"), "")
    .replace(new RegExp(SENTINEL, "g"), "");

  // Repair orphan bracket-opacity fragments left by a prior sweep run.
  after = after.replace(ORPHAN_BRACKET, "$1");

  if (after !== before) {
    writeFileSync(file, after);
    touched++;
    touchedFiles.push(file);
  }
}

process.stdout.write(`Touched ${touched} files, removed ${removed} tokens.\n`);
if (process.env.SWEEP_VERBOSE) {
  for (const f of touchedFiles) process.stdout.write(`  ${f}\n`);
}
