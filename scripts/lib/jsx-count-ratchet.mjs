/**
 * Shared machinery for the per-file, shrink-only JSX ratchets
 * (lint-no-raw-number-file-inputs, lint-no-title-tooltips,
 * lint-no-raw-clipboard).
 *
 * Same contract as lint-motion-tokens / lint-arbitrary-typography: today's
 * remaining occurrences are enumerated per file in governance.config.json →
 * <key>.allowlist as {file, count}. A file may only drop off the list or have
 * its count go down. Both directions fail:
 *   • a NEW occurrence (file/count not covered by the allowlist)  → FAIL
 *   • a STALE entry (allowlisted count higher than what is there) → FAIL
 * so the list can never drift out of sync with the code. Failures print
 * "  <file>: <n> found, <m> allowed", the format
 * scripts/regen-ratchet-baseline.mjs reads.
 *
 * The walk is plain node:fs — no ripgrep — because four guards once read zero
 * files in CI for want of rg and printed green the whole time
 * (tests/architecture/lint-guards-actually-guard.test.ts).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { stripComments } from "./strip-comments.mjs";

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".open-next",
  "storybook-static",
  "coverage",
  ".source",
  "__tests__",
]);

export function listSourceFiles(roots, { extensions = [".tsx"] } = {}) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) walk(join(dir, entry.name));
      } else if (
        extensions.some((ext) => entry.name.endsWith(ext)) &&
        !/\.test\.[jt]sx?$|\.spec\.[jt]sx?$/.test(entry.name)
      ) {
        out.push(join(dir, entry.name));
      }
    }
  };
  for (const root of roots) walk(root);
  return out.map((file) => relative(process.cwd(), resolve(file))).sort();
}

/**
 * Yield every JSX opening tag: `{ tag, attrs, index }`, where `attrs` is the
 * raw attribute text with `{…}` expressions intact. Braces and strings are
 * balanced, so an arrow function or a `>` inside an attribute does not end the
 * tag early. Generic type arguments (`useState<string>`) are skipped because
 * they are not followed by an attribute or a tag end.
 */
export function* openingTags(src) {
  const re = /<([A-Za-z][\w.]*)(?=[\s/>])/g;
  let match;
  while ((match = re.exec(src))) {
    let i = match.index + match[0].length;
    let depth = 0;
    let quote = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === quote && src[i - 1] !== "\\") quote = null;
        continue;
      }
      if (c === '"' || c === "'" || (c === "`" && depth > 0)) {
        quote = c;
        continue;
      }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
      else if (c === "<" && depth === 0) break; // not a tag after all
    }
    if (src[i] !== ">") continue;
    yield { tag: match[1], attrs: src.slice(match.index + match[0].length, i), index: match.index };
  }
}

/** Attribute names at the top level of a tag (ignoring `{…}` contents). */
export function topLevelAttributes(attrs) {
  let flat = "";
  let depth = 0;
  for (const c of attrs) {
    if (c === "{") depth++;
    if (depth === 0) flat += c;
    if (c === "}") depth--;
  }
  return flat;
}

export function sourceFor(file) {
  return stripComments(readFileSync(file, "utf-8"));
}

function loadAllowlist(key) {
  const cfg = JSON.parse(readFileSync(resolve(process.cwd(), "governance.config.json"), "utf-8"));
  const section = cfg[key];
  if (!section || !Array.isArray(section.allowlist)) {
    process.stderr.write(`❌ governance.config.json is missing a ${key}.allowlist array.\n`);
    process.exit(1);
  }
  return section.allowlist;
}

/**
 * Compare per-file counts to the allowlist and exit. `count(file)` returns the
 * number of occurrences in one file.
 */
export function runCountRatchet({ key, what, roots, files, count, fix }) {
  const actual = new Map();
  for (const file of files ?? listSourceFiles(roots)) {
    const n = count(file);
    if (n > 0) actual.set(file, n);
  }

  const allowlist = loadAllowlist(key);
  const allowed = new Map(allowlist.map((entry) => [entry.file, entry.count]));
  const grown = [];
  const stale = [];
  for (const [file, n] of actual) {
    const limit = allowed.get(file) ?? 0;
    if (n > limit) grown.push({ file, n, limit });
    else if (n < limit) stale.push({ file, n, limit });
  }
  for (const entry of allowlist) {
    if (!actual.has(entry.file)) stale.push({ file: entry.file, n: 0, limit: entry.count });
  }

  const total = [...actual.values()].reduce((a, b) => a + b, 0);
  if (grown.length === 0 && stale.length === 0) {
    process.stdout.write(
      `✅ ${what} ratchet holds: ${total} remaining across ${actual.size} file(s), matching ${key}.allowlist.\n`,
    );
    process.exit(0);
  }

  if (grown.length) {
    process.stderr.write(`\n❌ New ${what} (not covered by ${key}.allowlist):\n\n`);
    for (const v of grown) process.stderr.write(`  ${v.file}: ${v.n} found, ${v.limit} allowed\n`);
    process.stderr.write(`\nFix:\n${fix}\n`);
  }
  if (stale.length) {
    process.stderr.write(
      `\n❌ ${key}.allowlist is stale — fewer ${what} than recorded. Shrink it (or run node scripts/regen-ratchet-baseline.mjs ${key}):\n\n`,
    );
    for (const s of stale) process.stderr.write(`  ${s.file}: ${s.n} found, ${s.limit} allowed\n`);
  }
  process.stderr.write("\n");
  process.exit(1);
}
