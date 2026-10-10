#!/usr/bin/env node
// CI guard: UI copy lives in a message catalog (en.json), not in the component.
//
// Every next-intl surface serves the full 34-language wheel, but only catalog
// strings reach the translation workflow. Copy written inline as an English /
// Chinese pair reads English in ja/de/… and Simplified Chinese in zh-Hant.
// The landing grew four such mechanisms; this started as its guard and now
// covers every surface that renders translated UI.
//
// SHRINK-ONLY ratchet: remaining inline copy is enumerated per file in
// governance.config.json → inlineI18n.allowlist as {file, count}. Both
// directions fail:
//   • NEW inline copy (a file/count above the allowlist)   → FAIL
//   • a STALE entry (allowlisted count above what is left) → FAIL
//
// What counts:
//   1. `pick(<lang>, …)` / `bi(<lang>, …)`     a two-language picker
//   2. `isZhUiLocale(…)`                        a branch on "is this Chinese"
//   3. `{ en: "…"` / `{ zh: "…"`                an inline copy pair, either order
//   4. a line `en: {` / `zh: {`                 a copy table keyed by language
//                                               (the pattern 3 missed: 40 landing
//                                               glyphs hid behind it)
//   5. `locale === "zh"` / `lang !== "zh"`      a branch on bare "zh", which no
//                                               route locale is — it silently
//                                               never fires (the ICP footer)
//   6. `pickBilingual(…)`                       Forge's en/zh registry fields
// Reordering fields or renaming the picker is not a migration; the pattern
// follows the shape, not the spelling. Comments do not count. Tests and
// stories are exempt.
//
// Run: node scripts/lint-inline-i18n.mjs            (check)
//      node scripts/lint-inline-i18n.mjs --baseline (print the allowlist)
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stripComments } from "./lib/strip-comments.mjs";

const SCAN_ROOTS = [
  "apps/landing/src",
  "apps/web/src",
  "apps/forge/src",
  "apps/router/src",
  "apps/auth/src",
  "packages/design/ui/src",
  "packages/platform/i18n/src",
];

const PATTERNS = [
  // Any two-language picker called with a locale, whatever it is named.
  /\b(?:pick|bi)\(\s*[\w.]+\s*,/g,
  /\bisZhUiLocale\(/g,
  // An inline pair, in either field order.
  /\{\s*(?:en|zh):\s*["'`]/g,
  // A copy table keyed by language.
  /^\s*["']?(?:en|zh)["']?\s*:\s*\{/gm,
  // A branch on bare "zh".
  /\b(?:locale|lang)\s*[!=]==?\s*["']zh["']/g,
  /\bpickBilingual\(/g,
];

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch {
    return "";
  }
}

function count(file) {
  const src = stripComments(readFileSync(file, "utf-8"));
  let n = 0;
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    while (re.exec(src)) n++;
  }
  return n;
}

const files = sh(
  `find ${SCAN_ROOTS.join(" ")} -type f \\( -name '*.ts' -o -name '*.tsx' \\) -not -path '*/node_modules/*' -not -path '*/.next/*'`,
)
  .split("\n")
  .filter(Boolean)
  .filter((f) => !/\.(test|spec|stories)\.tsx?$/.test(f) && !/\/__tests__\//.test(f))
  // A picker's own definition is not a use of it.
  .filter(
    (f) => !f.endsWith("src/nebutra/i18n.ts") && !f.endsWith("apps/forge/src/lib/bilingual.ts"),
  );

const actual = new Map();
for (const file of files) {
  const n = count(file);
  if (n > 0) actual.set(file, n);
}

if (process.argv.includes("--baseline")) {
  const entries = [...actual.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, n]) => ({ file, count: n }));
  process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
  process.exit(0);
}

const cfg = JSON.parse(readFileSync(resolve(process.cwd(), "governance.config.json"), "utf-8"));
const allowlist = cfg.inlineI18n?.allowlist;
if (!Array.isArray(allowlist)) {
  process.stderr.write("❌ governance.config.json is missing inlineI18n.allowlist.\n");
  process.exit(1);
}
const allowed = new Map(allowlist.map((e) => [e.file, e.count]));

const added = [];
const stale = [];
for (const [file, n] of actual) {
  const a = allowed.get(file) ?? 0;
  if (n > a) added.push(`${file}: ${n} found, ${a} allowed`);
  else if (n < a) stale.push(`${file}: ${n} found, ${a} allowed`);
}
for (const e of allowlist)
  if (!actual.has(e.file)) stale.push(`${e.file}: 0 found, ${e.count} allowed`);

if (added.length === 0 && stale.length === 0) {
  const total = [...actual.values()].reduce((a, b) => a + b, 0);
  process.stdout.write(
    `✅ Inline-i18n ratchet holds: ${total} inline string(s) left across ${actual.size} file(s).\n`,
  );
  process.exit(0);
}
if (added.length) {
  process.stderr.write(
    "❌ New inline copy. Put it in the surface's catalog en.json and read it with getTranslations / useTranslations:\n",
  );
  for (const l of added) process.stderr.write(`  ${l}\n`);
}
if (stale.length) {
  process.stderr.write(
    "❌ Stale inlineI18n allowlist entries (copy migrated — shrink the list):\n",
  );
  for (const l of stale) process.stderr.write(`  ${l}\n`);
}
process.exit(1);
