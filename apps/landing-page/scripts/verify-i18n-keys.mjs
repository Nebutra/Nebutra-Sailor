#!/usr/bin/env node
/**
 * verify-i18n-keys.mjs
 *
 * Verifies that every non-canonical locale in apps/landing-page/messages/
 * matches the key shape of en.json. The app deep-merges English as fallback
 * at runtime, so missing keys silently render in English — this script is
 * the CI-blocking check that prevents that drift.
 *
 * Canonical source: en.json
 * Checked locales:  every other *.json sibling in the same directory
 *
 * Exit codes:
 *   0  — all locales match en.json (no missing, no extra keys)
 *   1  — drift detected, or a JSON file is malformed / unreadable
 *
 * Output is plain text, no ANSI colors, safe for both local TTY and CI logs.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = resolve(__dirname, "..", "messages");
const CANONICAL_LOCALE = "en";
const REPORT_LIMIT = 20;
const CONTENT_CHECK_NAMESPACES = new Set([
  "nav",
  "hero",
  "cta",
  "logoStrip",
  "monorepoTree",
  "stats",
  "metadata",
]);
const ALLOWED_IDENTICAL_VALUES = new Set([
  "",
  "Nebutra",
  "Nebutra Sailor",
  "GitHub",
  "Discord",
  "X (Twitter)",
  "Next.js",
  "Turborepo",
  "you@example.com",
]);

/**
 * Recursively flatten an object into dot-path leaf keys.
 * Treats arrays as leaves (matches next-intl ICU array semantics).
 */
function flatten(obj, prefix = "", acc = new Set()) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    if (prefix) acc.add(prefix);
    return acc;
  }
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, path, acc);
    } else {
      acc.add(path);
    }
  }
  return acc;
}

function loadLocale(locale) {
  const file = join(MESSAGES_DIR, `${locale}.json`);
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch (err) {
    throw new Error(`Failed to read ${file}: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse ${file}: ${err.message}`);
  }
}

function discoverLocales() {
  let entries;
  try {
    entries = readdirSync(MESSAGES_DIR);
  } catch (err) {
    throw new Error(`Failed to read messages directory ${MESSAGES_DIR}: ${err.message}`);
  }
  const locales = entries
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -".json".length))
    .sort();
  if (!locales.includes(CANONICAL_LOCALE)) {
    throw new Error(`Canonical locale '${CANONICAL_LOCALE}.json' not found in ${MESSAGES_DIR}`);
  }
  return locales;
}

function diff(locale, enKeys, localeKeys) {
  const missing = [];
  for (const key of enKeys) {
    if (!localeKeys.has(key)) missing.push(key);
  }
  const extra = [];
  for (const key of localeKeys) {
    if (!enKeys.has(key)) extra.push(key);
  }
  missing.sort();
  extra.sort();
  return { locale, missing, extra };
}

function findIdenticalCriticalMessages(locale, enFlat, localeFlat) {
  if (locale === "zh") return [];

  const identical = [];
  for (const [key, enValue] of Object.entries(enFlat)) {
    const namespace = key.split(".")[0];
    const localeValue = localeFlat[key];
    if (
      !CONTENT_CHECK_NAMESPACES.has(namespace) ||
      typeof enValue !== "string" ||
      typeof localeValue !== "string" ||
      ALLOWED_IDENTICAL_VALUES.has(enValue.trim()) ||
      enValue.trim().length < 3
    ) {
      continue;
    }
    if (localeValue.trim() === enValue.trim()) {
      identical.push(key);
    }
  }
  return identical.sort();
}

function formatList(keys, limit) {
  const shown = keys.slice(0, limit);
  const lines = shown.map((k) => `    - ${k}`);
  if (keys.length > limit) {
    lines.push(`    ... and ${keys.length - limit} more`);
  }
  return lines.join("\n");
}

function main() {
  process.stdout.write(`[i18n-verify] canonical source: ${CANONICAL_LOCALE}.json\n`);
  process.stdout.write(`[i18n-verify] messages dir: ${MESSAGES_DIR}\n\n`);

  const locales = discoverLocales();
  const en = loadLocale(CANONICAL_LOCALE);
  const enKeys = flatten(en);
  const enFlat = flattenToRecord(en);
  process.stdout.write(`[i18n-verify] ${CANONICAL_LOCALE}: ${enKeys.size} leaf keys\n`);

  const others = locales.filter((l) => l !== CANONICAL_LOCALE);
  const results = others.map((locale) => {
    const data = loadLocale(locale);
    const keys = flatten(data);
    const flat = flattenToRecord(data);
    return {
      ...diff(locale, enKeys, keys),
      identicalCritical: findIdenticalCriticalMessages(locale, enFlat, flat),
      total: keys.size,
    };
  });

  let hasDrift = false;
  for (const r of results) {
    const status =
      r.missing.length === 0 && r.extra.length === 0 && r.identicalCritical.length === 0
        ? "OK"
        : "DRIFT";
    process.stdout.write(
      `[i18n-verify] ${r.locale}: ${r.total} leaf keys | missing=${r.missing.length} extra=${r.extra.length} identicalCritical=${r.identicalCritical.length} [${status}]\n`,
    );
    if (r.missing.length > 0 || r.extra.length > 0 || r.identicalCritical.length > 0) {
      hasDrift = true;
    }
  }

  if (!hasDrift) {
    process.stdout.write(`\n[i18n-verify] all locales in sync with ${CANONICAL_LOCALE}.json\n`);
    return 0;
  }

  process.stdout.write(`\n[i18n-verify] DRIFT DETECTED\n`);
  for (const r of results) {
    if (r.missing.length === 0 && r.extra.length === 0 && r.identicalCritical.length === 0) {
      continue;
    }
    process.stdout.write(`\n  locale: ${r.locale}\n`);
    if (r.missing.length > 0) {
      process.stdout.write(
        `  missing (${r.missing.length}) — present in ${CANONICAL_LOCALE}, absent in ${r.locale}:\n`,
      );
      process.stdout.write(`${formatList(r.missing, REPORT_LIMIT)}\n`);
    }
    if (r.extra.length > 0) {
      process.stdout.write(
        `  extra (${r.extra.length}) — present in ${r.locale}, absent in ${CANONICAL_LOCALE}:\n`,
      );
      process.stdout.write(`${formatList(r.extra, REPORT_LIMIT)}\n`);
    }
    if (r.identicalCritical.length > 0) {
      process.stdout.write(
        `  identical critical messages (${r.identicalCritical.length}) — high-visibility strings still equal ${CANONICAL_LOCALE}:\n`,
      );
      process.stdout.write(`${formatList(r.identicalCritical, REPORT_LIMIT)}\n`);
    }
  }
  process.stdout.write(
    `\n[i18n-verify] fix: keep locale files key-compatible with en.json and translate high-visibility namespaces instead of leaving English copies.\n`,
  );
  return 1;
}

function flattenToRecord(obj, prefix = "", acc = {}) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    if (prefix) acc[prefix] = obj;
    return acc;
  }
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      flattenToRecord(value, path, acc);
    } else {
      acc[path] = value;
    }
  }
  return acc;
}

try {
  process.exit(main());
} catch (err) {
  process.stderr.write(`[i18n-verify] ERROR: ${err.message}\n`);
  process.exit(1);
}
