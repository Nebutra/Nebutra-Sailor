#!/usr/bin/env node

// CI guard: type in product apps comes from the app's type ladder, not from a
// number typed into a className.
//
// Why this exists: PARA's visual language decided four sizes (display 20 / body
// 14 / label 12 / meta 11, visual-language.md §6) and the decision lived only in
// prose. Seven sizes were in use before anyone noticed, and the two smallest were
// arbitrary values — invisible to review because nothing named them. Fixing the
// thirteen was easy; stopping the fourteenth is the point.
//
// SHRINK-ONLY ratchet, same shape as scripts/lint-motion-tokens.mjs: remaining
// bypasses are enumerated per file in governance.config.json →
// arbitraryTypography.allowlist as {file, count}. Both directions fail:
//   • a NEW bypass (a file/count not covered by the allowlist)   → FAIL
//   • a STALE entry (allowlisted count above what is there)      → FAIL
//
// What counts, and ONLY this — a noisy guard teaches people to ignore the gate,
// which is how lint-defined-css-vars.mjs ended up unwired:
//   1. `text-[<length>]`     an arbitrary font size
//   2. `tracking-[<value>]`  an arbitrary letter spacing
//   3. `leading-[<value>]`   an arbitrary line height
//
// What does NOT count, on purpose:
//   • `text-[var(--x)]` / `tracking-[var(--x)]` — a token referenced by name is
//     the opposite of an arbitrary value. Naming it is what we asked for.
//   • `text-[hsl(var(--x))]` and other colour forms — `text-` is overloaded for
//     colour, and a colour is not this guard's business.
//   • comments, which are prose.
//
// Run: node scripts/lint-arbitrary-typography.mjs

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Scoped to the apps that HAVE a ladder to comply with. apps/para defines one in
// src/styles/shell.css; the rest of the monorepo carries 1640 arbitrary type values across
// 366 files as of 2026-09-10, and pointing a guard at them before they have a ladder would
// produce 366 failures nobody can act on. Same staging as lint-motion-tokens.mjs, which
// governs packages/design/ui/src and says so. Add an app here when it adopts a ladder.
const SCAN_ROOTS = ["apps/para"];

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch {
    return "";
  }
}

function loadAllowlist() {
  const cfg = JSON.parse(readFileSync(resolve(process.cwd(), "governance.config.json"), "utf-8"));
  const section = cfg.arbitraryTypography;
  if (!section || !Array.isArray(section.allowlist)) {
    process.stderr.write(
      "❌ governance.config.json is missing an arbitraryTypography.allowlist array.\n",
    );
    process.exit(1);
  }
  return section.allowlist;
}

/** Comments are prose, not styling — blank them before scanning. */
function blankComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));
}

// A length literal: 11px, 0.875rem, 1.2em, 90%. Deliberately not `var(...)`,
// and for `text-` deliberately not a colour function or hex.
const SIZE_RE = /\btext-\[(-?[\d.]+(?:px|rem|em|ch|vw|vh|%|pt))\]/g;
const TRACKING_RE = /\btracking-\[(-?[\d.]+(?:px|rem|em|%)?)\]/g;
const LEADING_RE = /\bleading-\[(-?[\d.]+(?:px|rem|em|%)?)\]/g;

function countMatches(re, src) {
  re.lastIndex = 0;
  let n = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: iterator idiom
  while (re.exec(src)) n++;
  return n;
}

function violationsInFile(file) {
  const src = blankComments(readFileSync(file, "utf-8"));
  return (
    countMatches(SIZE_RE, src) + countMatches(TRACKING_RE, src) + countMatches(LEADING_RE, src)
  );
}

const files = sh(
  `find ${SCAN_ROOTS.join(" ")} -type f \\( -name '*.ts' -o -name '*.tsx' \\) ` +
    `-not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/.next/*' ` +
    `-not -path '*/.turbo/*' -not -path '*/storybook-static/*'`,
)
  .split("\n")
  .filter(Boolean)
  // Stories and tests demonstrate or assert against these strings on purpose.
  .filter((f) => !/\.(test|spec|stories)\.tsx?$/.test(f) && !/\/__tests__\//.test(f));

const actual = new Map();
for (const file of files) {
  const rel = file.startsWith("./") ? file.slice(2) : file;
  const count = violationsInFile(file);
  if (count > 0) actual.set(rel, count);
}

const allowlist = loadAllowlist();
const allowed = new Map(allowlist.map((e) => [e.file, e.count]));

const newViolations = [];
const staleEntries = [];

for (const [file, count] of actual) {
  const allowedCount = allowed.get(file) ?? 0;
  if (count > allowedCount) newViolations.push({ file, count, allowedCount });
  else if (count < allowedCount) staleEntries.push({ file, count, allowedCount });
}
for (const entry of allowlist) {
  if (!actual.has(entry.file)) {
    staleEntries.push({ file: entry.file, count: 0, allowedCount: entry.count });
  }
}

if (newViolations.length === 0 && staleEntries.length === 0) {
  const total = [...actual.values()].reduce((a, b) => a + b, 0);
  process.stdout.write(
    `✅ Arbitrary-typography ratchet holds: ${total} pre-existing reference(s) across ` +
      `${actual.size} file(s) in ${SCAN_ROOTS.join(", ")}, exactly matching the allowlist.\n`,
  );
  process.exit(0);
}

if (newViolations.length > 0) {
  process.stderr.write(
    `\n❌ ${newViolations.length} file(s) set type with an arbitrary value.\n` +
      `   Use the app's type ladder — for apps/para that is text-display / text-body /\n` +
      `   text-label / text-meta, defined in src/styles/shell.css. If the size you need is not\n` +
      `   on the ladder, add the ROLE there and argue for it, rather than typing a number here.\n\n`,
  );
  for (const v of newViolations) {
    process.stderr.write(`  ${v.file}: ${v.count} found, ${v.allowedCount} allowed\n`);
  }
}

if (staleEntries.length > 0) {
  process.stderr.write(
    `\n❌ ${staleEntries.length} allowlist entr${staleEntries.length === 1 ? "y is" : "ies are"} ` +
      `stale — fewer arbitrary type values than governance.config.json claims.\n` +
      `   Shrink arbitraryTypography.allowlist to match (or remove the entry entirely at 0).\n\n`,
  );
  for (const s of staleEntries) {
    process.stderr.write(`  ${s.file}: ${s.count} found, ${s.allowedCount} allowed\n`);
  }
}

process.exit(1);
