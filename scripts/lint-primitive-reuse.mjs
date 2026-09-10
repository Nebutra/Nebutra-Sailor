#!/usr/bin/env node

// CI guard: an interactive control in a product app comes from the design system,
// not from a raw <button> restyled at the call site.
//
// Why this exists: apps/para carried 42 raw <button> elements against 6 Button
// imports, and had zero uses of Card, Badge, Skeleton, Tooltip or Field. Nobody
// decided to stop reusing the library — the "check for an existing component"
// step was a habit rather than a gate, so it was skipped one file at a time. This
// makes it a gate. See docs/architecture/2026-09-10-frontend-constitution.md §2.
//
// SHRINK-ONLY ratchet: remaining raw buttons are enumerated per file in
// governance.config.json → primitiveReuse.allowlist as {file, count}, migrated
// on-touch. A new one fails; a stale count fails too, so the list cannot drift.
//
// What counts: `<button` in a .tsx file under a governed app.
//
// What does NOT count, on purpose — a noisy guard teaches people to ignore the
// gate:
//   • `<button` inside packages/** — primitives are built from raw elements by
//     definition; this guard is about call sites.
//   • stories and tests, which demonstrate and assert on markup.
//   • a file carrying a top-level `// @primitive-exempt: <reason>` comment, for
//     the genuine cases (a bare hit target with no Button semantics, a control
//     rendered through a library's render-prop).
//
// Run: node scripts/lint-primitive-reuse.mjs

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Same staging as lint-arbitrary-typography.mjs: govern the app being brought to
// the standard, widen as each app is migrated.
const SCAN_ROOTS = ["apps/para"];
const EXEMPT_RE = /^\s*\/\/\s*@primitive-exempt:/m;

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch {
    return "";
  }
}

function loadAllowlist() {
  const cfg = JSON.parse(readFileSync(resolve(process.cwd(), "governance.config.json"), "utf-8"));
  const section = cfg.primitiveReuse;
  if (!section || !Array.isArray(section.allowlist)) {
    process.stderr.write(
      "❌ governance.config.json is missing a primitiveReuse.allowlist array.\n",
    );
    process.exit(1);
  }
  return section.allowlist;
}

function blankComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));
}

function violationsInFile(file) {
  const raw = readFileSync(file, "utf-8");
  if (EXEMPT_RE.test(raw)) return 0;
  const src = blankComments(raw);
  return (src.match(/<button[\s>]/g) ?? []).length;
}

const files = sh(
  `find ${SCAN_ROOTS.join(" ")} -type f -name '*.tsx' ` +
    `-not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/.next/*' ` +
    `-not -path '*/.turbo/*'`,
)
  .split("\n")
  .filter(Boolean)
  .filter((f) => !/\.(test|spec|stories)\.tsx$/.test(f) && !/\/__tests__\//.test(f));

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
    `✅ Primitive-reuse ratchet holds: ${total} pre-existing raw <button> across ` +
      `${actual.size} file(s) in ${SCAN_ROOTS.join(", ")}, exactly matching the allowlist.\n`,
  );
  process.exit(0);
}

if (newViolations.length > 0) {
  process.stderr.write(
    `\n❌ ${newViolations.length} file(s) have MORE raw <button> elements than the shrink-only ` +
      `allowlist permits.\n` +
      `   Import Button from @nebutra/ui/primitives, or compose the pattern that already exists.\n` +
      `   For a genuine exception add a top-level  // @primitive-exempt: <reason>  comment.\n\n`,
  );
  for (const v of newViolations) {
    process.stderr.write(`  ${v.file}: ${v.count} found, ${v.allowedCount} allowed\n`);
  }
}

if (staleEntries.length > 0) {
  process.stderr.write(
    `\n❌ ${staleEntries.length} allowlist entr${staleEntries.length === 1 ? "y is" : "ies are"} ` +
      `stale — fewer raw <button> than governance.config.json claims.\n` +
      `   Shrink primitiveReuse.allowlist to match (or remove the entry entirely at 0).\n\n`,
  );
  for (const s of staleEntries) {
    process.stderr.write(`  ${s.file}: ${s.count} found, ${s.allowedCount} allowed\n`);
  }
}

process.exit(1);
