#!/usr/bin/env node
/**
 * CI guard: the language list lives in one place.
 *
 * PRODUCT_LANGUAGES (packages/platform/i18n/src/languages.ts) is the wheel;
 * PRODUCT_LANGUAGE_META carries each language's endonym and default region.
 * Every hand-kept copy found on 2026-10-10 had drifted from it:
 *   - scripts/i18n-catalogs.mjs lost cs, ro, hu → never translated
 *   - apps/web PATCH /api/account accepted 7 of 34 languages
 *   - apps/web profile select had labels for 7 of 34
 *   - apps/auth phone sign-in and @nebutra/i18n market resolution each kept a
 *     language → country table that duplicated defaultRegion
 *
 * A "hand-kept list" is any 12-line window that names four or more distinct
 * language tags as string literals or object keys. Files that legitimately
 * enumerate languages for another reason (a product with its own deliberate
 * en/zh scope, a language-detection tool's data) are allowlisted in
 * governance.config.json → localeLists.allowlist with the reason. Shrink-only:
 * a stale entry fails too.
 *
 * Run: node scripts/lint-locale-lists.mjs [--baseline]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "./lib/i18n-catalog.mjs";
import { PRODUCT_LANGUAGE_META, PRODUCT_LANGUAGES } from "./lib/i18n-registry.mjs";
import { stripComments } from "./lib/strip-comments.mjs";

/** Product keys, their canonical tags, and the common bare/regional spellings. */
const TAGS = new Set(PRODUCT_LANGUAGES);
for (const id of PRODUCT_LANGUAGES) {
  const m = PRODUCT_LANGUAGE_META[id];
  TAGS.add(`${m.language}-${m.defaultRegion}`);
  if (m.script) TAGS.add(`${m.language}-${m.script}-${m.defaultRegion}`);
}
for (const extra of ["zh", "zh-CN", "zh-TW", "zh-HK"]) TAGS.add(extra);

const escaped = [...TAGS].map((t) => t.replace(/-/g, "\\-")).join("|");
const QUOTED = new RegExp(`["'\`](${escaped})["'\`]`, "g");
const BARE_KEY = new RegExp(
  `^\\s*(${[...TAGS].filter((t) => /^[a-z]+$/.test(t)).join("|")})\\s*:`,
  "gm",
);

const WINDOW = 12;
const THRESHOLD = 4;

/** The registry itself, and the scripts that read it. */
const OWNERS = [
  "packages/platform/i18n/src/",
  "scripts/lib/i18n-registry.mjs",
  "scripts/lint-locale-lists.mjs",
];

export function findLocaleList(source) {
  const lines = stripComments(source).split("\n");
  for (let i = 0; i < lines.length; i++) {
    const window = lines.slice(i, i + WINDOW).join("\n");
    const found = new Set();
    for (const m of window.matchAll(QUOTED)) found.add(m[1]);
    for (const m of window.matchAll(BARE_KEY)) found.add(m[1]);
    if (found.size >= THRESHOLD) return { line: i + 1, tags: [...found] };
  }
  return null;
}

function walk(dir, out = []) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    if (["node_modules", "dist", "out", "generated"].includes(name) || name.startsWith("."))
      continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx?|mts|mjs|vue)$/.test(name) && !/\.(test|spec|stories)\./.test(name)) {
      if (!path.includes("__tests__")) out.push(path);
    }
  }
  return out;
}

function roots() {
  const out = [join(REPO_ROOT, "scripts")];
  for (const app of readdirSync(join(REPO_ROOT, "apps")))
    out.push(join(REPO_ROOT, "apps", app, "src"));
  for (const group of readdirSync(join(REPO_ROOT, "packages"))) {
    const dir = join(REPO_ROOT, "packages", group);
    if (!statSync(dir).isDirectory()) continue;
    for (const pkg of readdirSync(dir)) out.push(join(dir, pkg, "src"));
  }
  return out;
}

function main() {
  const hits = new Map();
  for (const root of roots()) {
    for (const file of walk(root)) {
      const rel = relative(REPO_ROOT, file);
      if (OWNERS.some((o) => rel.startsWith(o))) continue;
      const hit = findLocaleList(readFileSync(file, "utf8"));
      if (hit) hits.set(rel, hit);
    }
  }

  if (process.argv.includes("--baseline")) {
    const list = [...hits.keys()].sort().map((file) => ({ file, reason: "" }));
    process.stdout.write(`${JSON.stringify(list, null, 2)}\n`);
    return 0;
  }

  const cfg = JSON.parse(readFileSync(join(REPO_ROOT, "governance.config.json"), "utf8"));
  const allowlist = cfg.localeLists?.allowlist ?? [];
  const allowed = new Set(allowlist.map((e) => e.file));
  const fresh = [...hits].filter(([file]) => !allowed.has(file));
  const stale = allowlist.filter((e) => !hits.has(e.file)).map((e) => e.file);
  const unexplained = allowlist.filter((e) => !e.reason?.trim()).map((e) => e.file);

  if (!fresh.length && !stale.length && !unexplained.length) {
    process.stdout.write(
      `✅ Locale lists: none outside @nebutra/i18n beyond ${allowlist.length} explained exception(s).\n`,
    );
    return 0;
  }
  for (const [file, { line, tags }] of fresh) {
    process.stderr.write(`❌ ${file}:${line} hand-lists languages (${tags.join(", ")})\n`);
  }
  if (fresh.length) {
    process.stderr.write(
      "   Read PRODUCT_LANGUAGES / PRODUCT_LANGUAGE_META / CANONICAL_LOCALES from @nebutra/i18n instead.\n",
    );
  }
  for (const file of stale) {
    process.stderr.write(
      `❌ stale localeLists allowlist entry (no list left — delete it): ${file}\n`,
    );
  }
  for (const file of unexplained) {
    process.stderr.write(`❌ localeLists allowlist entry without a reason: ${file}\n`);
  }
  return 1;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  process.exit(main());
}
