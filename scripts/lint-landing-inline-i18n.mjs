#!/usr/bin/env node
// CI guard: apps/landing copy lives in messages/en.json, not in the component.
//
// Why this exists: the landing grew four ways to say a string in two languages —
// next-intl messages, `pick(l, { en, zh })` from nebutra/i18n, `{ en, zh }` COPY
// objects behind `isZhUiLocale`, and content/site.ts `Copy` pairs. Routes serve
// every language in the product wheel, but only messages/*.json reach the
// translation pipeline, so any inline pair reads English in ja/de/… and
// Simplified Chinese in zh-Hant. One source: messages/en.json, per-page
// namespaces, read with getTranslations / useTranslations.
//
// SHRINK-ONLY ratchet, same shape as lint-arbitrary-typography.mjs: remaining
// inline copy is enumerated per file in governance.config.json →
// landingInlineI18n.allowlist as {file, count}. Both directions fail:
//   • NEW inline copy (a file/count above the allowlist)   → FAIL
//   • a STALE entry (allowlisted count above what is left) → FAIL
//
// What counts:
//   1. `pick(<lang>, …)`            nebutra/i18n's two-language picker
//   2. `isZhUiLocale(…)`             a branch on "is this Chinese"
//   3. `{ en: "…"` / `{ en: '…'` / `{ en: \`…`   an inline copy pair
// Comments do not count. Tests and stories are exempt.
//
// Run: node scripts/lint-landing-inline-i18n.mjs            (check)
//      node scripts/lint-landing-inline-i18n.mjs --baseline (print the allowlist)
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stripComments } from "./lib/strip-comments.mjs";

const SCAN_ROOT = "apps/landing/src";

const PATTERNS = [/\bpick\(\s*[\w.]+\s*,/g, /\bisZhUiLocale\(/g, /\{\s*en:\s*["'`]/g];

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
    // biome-ignore lint/suspicious/noAssignInExpressions: iterator idiom
    while (re.exec(src)) n++;
  }
  return n;
}

const files = sh(
  `find ${SCAN_ROOT} -type f \\( -name '*.ts' -o -name '*.tsx' \\) -not -path '*/node_modules/*' -not -path '*/.next/*'`,
)
  .split("\n")
  .filter(Boolean)
  .filter((f) => !/\.(test|spec|stories)\.tsx?$/.test(f) && !/\/__tests__\//.test(f))
  // The picker's own definition is not a use of it.
  .filter((f) => !f.endsWith("src/nebutra/i18n.ts"));

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
const allowlist = cfg.landingInlineI18n?.allowlist;
if (!Array.isArray(allowlist)) {
  process.stderr.write("❌ governance.config.json is missing landingInlineI18n.allowlist.\n");
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
    `✅ Landing inline-i18n ratchet holds: ${total} inline string(s) left across ${actual.size} file(s).\n`,
  );
  process.exit(0);
}
if (added.length) {
  process.stderr.write(
    "❌ New inline copy in apps/landing. Put it in apps/landing/messages/en.json and read it with getTranslations / useTranslations:\n",
  );
  for (const l of added) process.stderr.write(`  ${l}\n`);
}
if (stale.length) {
  process.stderr.write(
    "❌ Stale landingInlineI18n allowlist entries (copy migrated — shrink the list):\n",
  );
  for (const l of stale) process.stderr.write(`  ${l}\n`);
}
process.exit(1);
