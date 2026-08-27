#!/usr/bin/env node

// CI guard: motion consumption must go through the four-rail duration tokens
// (--duration-micro/flow/reveal/cinematic, Tailwind `duration-micro` &c. — see
// packages/design/ui/src/tokens/motion.ts) instead of a raw millisecond value.
//
// SHRINK-ONLY ratchet, same shape as scripts/lint-repository-seam.mjs: today's
// remaining bypasses are enumerated per file in governance.config.json →
// motionTokens.allowlist as {file, count}. A file may only DROP off the list or
// have its count go DOWN as it's migrated on-touch. Both directions fail:
//   • a NEW bypass (a file/count not covered by the allowlist)            → FAIL
//   • a STALE entry (allowlisted count higher than what's actually there,
//     or a listed file that no longer has any bypass at all)             → FAIL
// Wrong-count entries force the list to be re-generated, which is the point —
// a fixed count can't silently drift out of sync with the code again.
//
// Scope: packages/design/ui/src only (the design-system source of truth for
// motion). Product apps are governed separately once they adopt the same rails.
//
// Two violation classes are counted, and ONLY these — see the "what does NOT
// count" note below, which exists precisely because lint-defined-css-vars.mjs
// sat unwired for months after 9 of its 12 reports turned out to be false
// positives. A noisy guard teaches people to ignore the gate.
//
//   1. A Tailwind `duration-<digits>` utility (e.g. `duration-300`) — the
//      named rails (`duration-micro` &c.) don't match \d+, so this can never
//      flag a compliant class.
//   2. A raw `<N>ms` literal in an ACTUAL CSS-timing position:
//        - `duration-[NNNms]`            (Tailwind arbitrary duration)
//        - `[animation-delay:NNNms]`     (Tailwind arbitrary animation-delay)
//        - `transition: "... NNNms ..."` (inline style, incl. ternary form)
//        - a `--*duration*` / `--*delay*` custom property set to `"NNNms"`
//
// What does NOT count, on purpose, because it produced false positives during
// authoring: prose/JSDoc comments (blanked before scanning, same helper as
// lint-defined-css-vars.mjs), Storybook example DATA that happens to contain
// the substring "NNNms" (a displayed metric like `value="148ms"`, dialogue
// text like "p95 < 180ms"), and any `<N>ms` that isn't sitting inside one of
// the four timing positions above (e.g. a doc comment stating "default
// timeout 2000ms" on a non-visual prop). A guard that can't tell a CSS
// duration from a stat label is worse than no guard.
//
// Run: node scripts/lint-motion-tokens.mjs

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SCAN_ROOT = "packages/design/ui/src";

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch {
    return "";
  }
}

function loadAllowlist() {
  const cfgPath = resolve(process.cwd(), "governance.config.json");
  const cfg = JSON.parse(readFileSync(cfgPath, "utf-8"));
  const section = cfg.motionTokens;
  if (!section || !Array.isArray(section.allowlist)) {
    process.stderr.write("❌ governance.config.json is missing a motionTokens.allowlist array.\n");
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

const DURATION_UTILITY_RE = /\bduration-(\d{2,4})\b/g;
const ARBITRARY_DURATION_RE = /duration-\[(\d+)ms\]/g;
const ARBITRARY_DELAY_RE = /\[animation-delay:(\d+)ms\]/g;
const INLINE_TRANSITION_RE =
  /\btransition["']?\s*:\s*(?:!?[\w.]+\s*\?\s*)?["'`][^"'`]*?\b(\d+)ms\b/g;
const CUSTOM_PROP_RE = /["'`]--[\w-]*(?:duration|delay)[\w-]*["'`]\s*:\s*["'`](\d+)ms["'`]/g;

function countMatches(re, src) {
  re.lastIndex = 0;
  let n = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: iterator idiom
  while (re.exec(src)) n++;
  return n;
}

function violationsInFile(file) {
  const raw = readFileSync(file, "utf-8");
  const src = blankComments(raw);
  return (
    countMatches(DURATION_UTILITY_RE, src) +
    countMatches(ARBITRARY_DURATION_RE, src) +
    countMatches(ARBITRARY_DELAY_RE, src) +
    countMatches(INLINE_TRANSITION_RE, src) +
    countMatches(CUSTOM_PROP_RE, src)
  );
}

// ── Collect candidate files ─────────────────────────────────────────────────

const files = sh(
  `find ${SCAN_ROOT} -type f \\( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \\) ` +
    `-not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/.turbo/*'`,
)
  .split("\n")
  .filter(Boolean)
  // Test files assert the ABSENCE of raw values (`expect(source).not.toMatch(...)`)
  // — scanning them would count a negative assertion as a positive violation.
  .filter((f) => !/\.test\.tsx?$/.test(f) && !/\/__tests__\//.test(f));

const actual = new Map();
for (const file of files) {
  const rel = file.startsWith("./") ? file.slice(2) : file;
  const count = violationsInFile(file);
  if (count > 0) actual.set(rel, count);
}

// ── Compare against the shrink-only allowlist ───────────────────────────────

const allowlist = loadAllowlist();
const allowed = new Map(allowlist.map((e) => [e.file, e.count]));

const newViolations = []; // present now, not covered (or over the allowed count)
const staleEntries = []; // allowlisted but count dropped (or file now clean)

for (const [file, count] of actual) {
  const allowedCount = allowed.get(file) ?? 0;
  if (count > allowedCount) {
    newViolations.push({ file, count, allowedCount });
  } else if (count < allowedCount) {
    staleEntries.push({ file, count, allowedCount });
  }
}

for (const entry of allowlist) {
  if (!actual.has(entry.file)) {
    staleEntries.push({ file: entry.file, count: 0, allowedCount: entry.count });
  }
}

if (newViolations.length === 0 && staleEntries.length === 0) {
  const total = [...actual.values()].reduce((a, b) => a + b, 0);
  process.stdout.write(
    `✅ Motion-token ratchet holds: ${total} pre-existing raw-duration reference(s) ` +
      `across ${actual.size} file(s) in ${SCAN_ROOT}, exactly matching the allowlist.\n`,
  );
  process.exit(0);
}

if (newViolations.length > 0) {
  process.stderr.write(
    `\n❌ ${newViolations.length} file(s) have MORE raw-duration references than the ` +
      `shrink-only allowlist permits.\n` +
      `   Use duration-micro/flow/reveal/cinematic (see packages/design/ui/src/tokens/motion.ts) ` +
      `for hover/toggle feedback, state transitions, content reveal, or hero-grade delight — in\n` +
      `   that INTENT order. Leave genuinely ambiguous cases alone rather than force a wrong rail.\n\n`,
  );
  for (const v of newViolations) {
    process.stderr.write(`  ${v.file}: ${v.count} found, ${v.allowedCount} allowed\n`);
  }
}

if (staleEntries.length > 0) {
  process.stderr.write(
    `\n❌ ${staleEntries.length} allowlist entr${staleEntries.length === 1 ? "y is" : "ies are"} ` +
      `stale — the code has FEWER raw-duration references than governance.config.json claims.\n` +
      `   Shrink motionTokens.allowlist in governance.config.json to match (or remove the entry ` +
      `entirely at 0).\n\n`,
  );
  for (const s of staleEntries) {
    process.stderr.write(`  ${s.file}: allowlist says ${s.allowedCount}, actual is ${s.count}\n`);
  }
}

process.stderr.write("\n");
process.exit(1);
