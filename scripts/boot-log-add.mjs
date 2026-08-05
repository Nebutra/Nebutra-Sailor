#!/usr/bin/env node

// Merge authored boot-log entries into the archive.
//
// The archive lives in two places on purpose — structure in
// apps/auth/src/content/boot-log.ts, prose in the `boot-log` message catalog —
// so adding an entry means writing to both, plus seeding the 33 locales the
// translator has not reached yet. Doing that by hand is how an entry ends up in
// one half and not the other, which renders as a silently shorter rotation.
//
// Usage:
//   node scripts/boot-log-add.mjs <cluster.json> [...]  [--audit <verdicts.json>]
//   node scripts/boot-log-add.mjs --check          (validate the archive as it stands)
//
// A cluster file is {"entries":[{id, stamp, sources:[{label,url}], zh:{...}, en:{...}}]}.
// An audit file is {"verdicts":[{id, verdict:"keep"|"warn"|"drop", reason}]} — every
// id marked drop is refused here rather than being remembered by a human.
//
// Everything this script enforces is the editorial contract at the top of
// boot-log.ts, in executable form. It refuses rather than repairs: a body that
// runs long is an editorial decision, not something a script should truncate.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STRUCTURE = join(REPO_ROOT, "apps/auth/src/content/boot-log.ts");
const CATALOG_DIR = join(REPO_ROOT, "packages/platform/i18n/boot-log");

/** Authored languages. Everything else is seeded from `en` for the pipeline. */
const AUTHORED = ["en", "zh"];
/** Locales that carry the authored Chinese rather than the English seed. */
const CHINESE_FILES = new Set(["zh", "zh-Hans"]);

const LIMITS = {
  zh: { body: [24, 130], coda: [4, 40] },
  en: { body: [80, 320], coda: [20, 160] },
};

// 禁标点 plus the narration ban: a sentence that points at the meaning takes the
// meaning away from the reader. See docs/microcopy/nebutra-microcopy-system.md.
const BANNED = [
  "命运",
  "齿轮",
  "冥冥之中",
  "由此可见",
  "世界真小",
  "谁也没想到",
  "改变了一切",
  "永不放弃",
  "little did they know",
  "the rest is history",
];

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const stampYear = (stamp) => {
  const m = /\d{4}/.exec(stamp);
  return m ? Number(m[0]) : Number.NaN;
};

function validate(entry, knownIds) {
  const problems = [];
  const id = entry.id ?? "(no id)";
  if (!entry.id) problems.push("missing id");
  if (knownIds.has(entry.id)) problems.push("duplicate id");
  if (!Number.isFinite(stampYear(entry.stamp ?? ""))) problems.push("stamp has no year");
  if (!entry.sources?.length) problems.push("no sources — an entry written from memory has none");
  for (const source of entry.sources ?? []) {
    if (!/^https?:\/\/\S+$/.test(source.url ?? "")) problems.push(`bad source url: ${source.url}`);
    if (!source.label?.trim()) problems.push("source without a label");
  }
  for (const lang of AUTHORED) {
    const copy = entry[lang];
    if (!copy) {
      problems.push(`missing ${lang}`);
      continue;
    }
    for (const field of ["tag", "title", "body", "coda"]) {
      if (!copy[field]?.trim()) problems.push(`${lang}.${field} empty`);
    }
    for (const field of ["body", "coda"]) {
      const [min, max] = LIMITS[lang][field];
      const len = copy[field]?.length ?? 0;
      if (len < min || len > max)
        problems.push(`${lang}.${field} length ${len}, want ${min}-${max}`);
    }
    const text = [copy.title, copy.body, copy.coda].join(" ");
    if (/[!！]/.test(text)) problems.push(`${lang} shouts`);
    if (/\p{Extended_Pictographic}/u.test(text)) problems.push(`${lang} has an emoji`);
    if (/https?:\/\//.test(text)) problems.push(`${lang} carries a URL — citations stay in code`);
    for (const word of BANNED) {
      if (text.toLowerCase().includes(word.toLowerCase()))
        problems.push(`${lang} narrates: ${word}`);
    }
  }
  return problems.map((p) => `${id}: ${p}`);
}

/** Serialise the structural half, matching what biome would format anyway. */
function toTypeScript(entry) {
  const q = (value) => JSON.stringify(value);
  const sources = entry.sources
    .map((s) => `      { label: ${q(s.label)}, url: ${q(s.url)} },\n`)
    .join("");
  return `  {\n    id: ${q(entry.id)},\n    stamp: ${q(entry.stamp)},\n    sources: [\n${sources}    ],\n  },\n`;
}

function insertByYear(source, entry) {
  const year = stampYear(entry.stamp);
  const blocks = [...source.matchAll(/^ {2}\{\n {4}id: /gm)].map((m) => m.index);
  for (const at of blocks) {
    const m = /stamp: "(\d{4})/.exec(source.slice(at, at + 400));
    if (m && Number(m[1]) > year) {
      return source.slice(0, at) + toTypeScript(entry) + source.slice(at);
    }
  }
  const end = source.indexOf("];\n\n/**\n * Leading year of a stamp.");
  return source.slice(0, end) + toTypeScript(entry) + source.slice(end);
}

const args = process.argv.slice(2);
const auditAt = args.indexOf("--audit");
const auditPath = auditAt === -1 ? null : args[auditAt + 1];
// Without --audit, auditAt is -1 and auditAt + 1 is 0 — which would silently
// swallow the first cluster path. Skip nothing unless the flag is present.
const auditValueAt = auditAt === -1 ? -1 : auditAt + 1;
const clusterPaths = args.filter((a, i) => !a.startsWith("--") && i !== auditValueAt);
const checkOnly = args.includes("--check");

const dropped = new Set();
if (auditPath) {
  for (const verdict of read(auditPath).verdicts ?? []) {
    if (verdict.verdict === "drop") dropped.add(verdict.id);
  }
}

let structure = readFileSync(STRUCTURE, "utf8");
const knownIds = new Set([...structure.matchAll(/^ {4}id: "([^"]+)"/gm)].map((m) => m[1]));
const catalogs = Object.fromEntries(
  readdirSync(CATALOG_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.replace(/\.json$/, ""), read(join(CATALOG_DIR, f))]),
);

if (checkOnly) {
  const missing = [...knownIds].filter(
    (id) => !catalogs.en?.entries[id] || !catalogs.zh?.entries[id],
  );
  const orphaned = Object.keys(catalogs.en?.entries ?? {}).filter((id) => !knownIds.has(id));
  process.stdout.write(`structure: ${knownIds.size} entries\n`);
  process.stdout.write(
    `copy missing from en or zh: ${missing.length ? missing.join(", ") : "none"}\n`,
  );
  process.stdout.write(
    `copy with no structure: ${orphaned.length ? orphaned.join(", ") : "none"}\n`,
  );
  process.exit(missing.length || orphaned.length ? 1 : 0);
}

const incoming = clusterPaths.flatMap((p) => read(p).entries ?? []);
const kept = [];
const refused = [];
for (const entry of incoming) {
  if (dropped.has(entry.id)) {
    refused.push(`${entry.id}: dropped by audit`);
    continue;
  }
  const problems = validate(entry, knownIds);
  if (problems.length) {
    refused.push(...problems);
    continue;
  }
  knownIds.add(entry.id);
  kept.push(entry);
}

kept.sort((a, b) => stampYear(a.stamp) - stampYear(b.stamp));
for (const entry of kept) {
  structure = insertByYear(structure, entry);
  for (const [locale, catalog] of Object.entries(catalogs)) {
    const lang = CHINESE_FILES.has(locale) ? "zh" : "en";
    const { tag, title, body, coda } = entry[lang];
    catalog.entries[entry.id] = { tag, title, body, coda };
  }
}

if (kept.length) {
  writeFileSync(STRUCTURE, structure);
  for (const [locale, catalog] of Object.entries(catalogs)) {
    writeFileSync(join(CATALOG_DIR, `${locale}.json`), `${JSON.stringify(catalog, null, 2)}\n`);
  }
}

process.stdout.write(`added ${kept.length} entries, archive now ${knownIds.size}\n`);
if (refused.length) {
  process.stdout.write(`refused ${refused.length}:\n${refused.map((r) => `  ${r}`).join("\n")}\n`);
}
