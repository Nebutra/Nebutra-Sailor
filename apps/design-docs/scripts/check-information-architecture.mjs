#!/usr/bin/env node
/* eslint-env node */

/**
 * Design docs information-architecture guard.
 *
 * This is intentionally stricter than a link checker: it validates the
 * relationship between docs navigation, locale parity, component previews, and
 * public registry manifests so design-docs stays a source of truth instead of
 * a pile of MDX pages that happens to build.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const DOCS_DIR = path.join(ROOT, "content", "docs");
const SECTIONS = ["components", "foundations", "fragment-components", "patterns"];
const LANGS = ["en", "zh"];

const registryOnlyAllowlist = new Map([
  [
    "animate-in",
    "motion helper consumed by demos and registry installs before a dedicated docs page exists",
  ],
  ["chart", "documented through patterns/charts until the chart primitive API is stabilized"],
  ["collapse", "Geist facade over Accordion; docs currently live under collapsible"],
  ["loading-dots", "small feedback primitive documented through spinner/loader surfaces"],
  [
    "nebutra-tokens",
    "registry bootstrap item; canonical docs live in foundations/theming and tailwind",
  ],
  ["status-dot", "micro-status primitive used by registry demos before a dedicated component page"],
]);

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function listMdxSlugs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""))
    .sort();
}

function listedPages(metaFile) {
  const meta = readJson(metaFile);
  return meta.pages.filter((entry) => typeof entry === "string" && !entry.startsWith("---"));
}

function diff(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

function collectMdxFiles(dir = DOCS_DIR) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMdxFiles(absolute));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(absolute);
    }
  }
  return files;
}

function relative(file) {
  return path.relative(ROOT, file);
}

function assertSectionMeta(lang, section) {
  const dir = path.join(DOCS_DIR, lang, section);
  const metaFile = path.join(dir, "meta.json");
  const slugs = listMdxSlugs(dir);
  const pages = listedPages(metaFile);
  const unlisted = diff(slugs, pages);
  const missing = diff(pages, slugs);

  if (unlisted.length > 0) {
    fail(`${lang}/${section}/meta.json does not list: ${unlisted.join(", ")}`);
  }
  if (missing.length > 0) {
    fail(`${lang}/${section}/meta.json lists missing pages: ${missing.join(", ")}`);
  }
}

function assertLocaleParity(section) {
  const en = listMdxSlugs(path.join(DOCS_DIR, "en", section));
  const zh = listMdxSlugs(path.join(DOCS_DIR, "zh", section));
  const missingZh = diff(en, zh);
  const missingEn = diff(zh, en);

  if (missingZh.length > 0) {
    fail(`zh/${section} is missing pages present in en: ${missingZh.join(", ")}`);
  }
  if (missingEn.length > 0) {
    fail(`en/${section} is missing pages present in zh: ${missingEn.join(", ")}`);
  }
}

function assertRootIncludesApi(lang) {
  const rootMeta = readJson(path.join(DOCS_DIR, lang, "meta.json"));
  if (!rootMeta.pages.includes("...api")) {
    fail(`${lang}/meta.json must include ...api so API reference is part of docs IA`);
  }
}

function assertPreviewRegistry() {
  const mdxFiles = collectMdxFiles();
  const previewRefs = new Set();
  const previewPattern = /<ComponentPreview\s+[^>]*name=["']([^"']+)["']/g;
  for (const file of mdxFiles) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(previewPattern)) {
      previewRefs.add(match[1]);
    }
  }

  const generatedIndex = fs.readFileSync(
    path.join(ROOT, "src", "__registry__", "index.tsx"),
    "utf8",
  );
  const previewKeys = new Set(
    [...generatedIndex.matchAll(/"([^"]+)":\s*\{\s*name:/g)].map((match) => match[1]),
  );
  const missing = [...previewRefs].filter((name) => !previewKeys.has(name)).sort();

  if (missing.length > 0) {
    fail(`ComponentPreview references missing generated demos: ${missing.join(", ")}`);
  }

  const orphaned = [...previewKeys].filter((name) => !previewRefs.has(name)).sort();
  if (orphaned.length > 0) {
    warn(`${orphaned.length} generated previews are not linked from MDX; classify or delete them.`);
  }
}

function assertRegistryDocs() {
  const registry = readJson(path.join(ROOT, "public", "registry.json"));
  const enDocSlugs = new Set();
  for (const section of SECTIONS) {
    for (const slug of listMdxSlugs(path.join(DOCS_DIR, "en", section))) {
      enDocSlugs.add(slug);
    }
  }

  for (const item of registry.items) {
    if (enDocSlugs.has(item.name)) continue;
    if (registryOnlyAllowlist.has(item.name)) continue;
    fail(
      `registry item "${item.name}" has no matching English docs page and is not in the registry-only allowlist`,
    );
  }

  for (const [name, reason] of registryOnlyAllowlist) {
    if (registry.items.some((item) => item.name === name)) {
      warn(`registry-only allowlist: ${name} — ${reason}`);
    }
  }
}

function assertNoStaleSubstrateCopy() {
  const staleSubstratePattern =
    /(built on Radix|基于 Radix|@radix-ui\/react-(dialog|tooltip|popover|progress|separator|label|dropdown-menu|alert-dialog))/i;
  for (const file of collectMdxFiles(path.join(DOCS_DIR))) {
    const source = fs.readFileSync(file, "utf8");
    if (staleSubstratePattern.test(source)) {
      fail(
        `${relative(file)} contains stale Radix substrate copy; document the current primitive contract.`,
      );
    }
  }
}

function assertBrandTokenTruth() {
  const bannedDriftColors = /#(?:6366f1|3B82F6)/i;
  for (const file of collectMdxFiles(path.join(DOCS_DIR))) {
    const source = fs.readFileSync(file, "utf8");
    if (bannedDriftColors.test(source)) {
      fail(`${relative(file)} contains drifted brand color literals (#6366f1 or #3B82F6).`);
    }
  }
}

for (const lang of LANGS) {
  assertRootIncludesApi(lang);
  for (const section of SECTIONS) {
    assertSectionMeta(lang, section);
  }
}

for (const section of SECTIONS) {
  assertLocaleParity(section);
}

assertPreviewRegistry();
assertRegistryDocs();
assertNoStaleSubstrateCopy();
assertBrandTokenTruth();

for (const message of warnings) {
  console.warn(`[design-docs:ia] WARN ${message}`);
}

if (failures.length > 0) {
  for (const message of failures) {
    console.error(`[design-docs:ia] FAIL ${message}`);
  }
  process.exit(1);
}

process.stdout.write("[design-docs:ia] OK information architecture is internally consistent\n");
