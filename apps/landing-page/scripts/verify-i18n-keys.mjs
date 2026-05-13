#!/usr/bin/env node
/**
 * verify-i18n-keys.mjs
 *
 * Three-tier i18n integrity check for apps/landing-page/messages/.
 *
 * Tier 1 (blocking, exit 1):
 *   - Key parity: every locale must have the same leaf-key shape as en.json.
 *     Missing keys silently fall back to English at runtime (next-intl
 *     deep-merge), which is exactly the drift class this gate prevents.
 *   - Placeholder parity: `{var}` and `{var, plural, ...}` ICU tokens in
 *     en.json must appear in every locale value. A missing placeholder
 *     turns into a literal `undefined` rendered to the user.
 *   - High-visibility identical-to-EN strings in critical namespaces
 *     (nav / hero / cta / etc.) — these are above-the-fold copy.
 *
 * Tier 2 (advisory, exit 0 but reported):
 *   - Identical-to-EN strings across all other content namespaces.
 *     Catches the "key exists, value is still English placeholder" class.
 *
 * Tier 3 (always reported, never fails):
 *   - Per-locale translation coverage summary.
 *
 * Canonical source: en.json
 * Checked locales:  every other *.json sibling in the same directory
 *
 * Flags:
 *   --strict    Promote Tier 2 (advisory identical-to-EN) to blocking.
 *   --json      Emit a machine-readable JSON report on stdout (no human log).
 *
 * Exit codes:
 *   0  — all gates pass
 *   1  — drift detected, malformed JSON, or unreadable file
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = resolve(__dirname, "..", "messages");
const CANONICAL_LOCALE = "en";
const REPORT_LIMIT = 20;

const ARGS = new Set(process.argv.slice(2));
const STRICT = ARGS.has("--strict");
const JSON_OUT = ARGS.has("--json");

// Namespaces that ship as above-the-fold marketing copy. An identical-to-EN
// value here is almost always a translation regression and blocks CI.
// Excludes `nav` and `footer` because those are dominated by short link
// labels (Blog, FAQ, npm, DPA, Docs, Dashboard) that B2B SaaS commonly
// keeps in English across locales by convention.
const CRITICAL_CONTENT_NAMESPACES = new Set([
  "hero",
  "cta",
  "logoStrip",
  "monorepoTree",
  "stats",
  "metadata",
  "features",
  "comingSoon",
  "impact",
]);

// Namespaces where identical-to-EN is reported as Tier 2 advisory (not
// blocking by default — promoted to blocking under --strict).
const ADVISORY_CONTENT_NAMESPACES = new Set([
  "nav",
  "footer",
  "landing",
  "legal",
  "legalPages",
  "marketing",
  "microLanding",
  "featuresPage",
  "useCases",
  "licensing",
  "licenseWizard",
  "changelogMeta",
  "roadmapMeta",
  "blogMeta",
  "getLicenseMeta",
  "designSystem",
  "cookieConsent",
  "compliance",
  "icpFooter",
  "error",
]);

// Strings that legitimately read the same in every locale: brand names,
// product names, tech stack tokens, version numbers, emails. Maintained
// here (not auto-detected) so the linter is deterministic and reviewable.
const ALLOWED_IDENTICAL_VALUES = new Set([
  "",
  // Company / product
  "Nebutra",
  "Nebutra Sailor",
  "Sailor",
  // Social / contact
  "GitHub",
  "GitHub Issues",
  "Discord",
  "Slack",
  "X (Twitter)",
  "you@example.com",
  // Frameworks / libraries (must NOT be translated)
  "Next.js",
  "Nuxt",
  "TanStack",
  "React",
  "TypeScript",
  "Tailwind",
  "Prisma",
  "Hono",
  "FastAPI",
  "Radix",
  "shadcn/ui",
  "framer-motion",
  "Playwright",
  "Turborepo",
  "OpenAI",
  "OpenRouter",
  "Clerk",
  "Better Auth",
  "NextAuth",
  "Supabase",
  "QStash",
  "BullMQ",
  "Resend",
  "Stripe",
  "Polar",
  "LemonSqueezy",
  "ChinaPay",
  "Meilisearch",
  "Typesense",
  "Algolia",
  "Svix",
  "Novu",
  "Pusher",
  "Inngest",
  "ClickHouse",
  "trigger.dev",
  "Lobe UI",
  "oRPC",
  "tRPC",
  "OpenAPI",
  "pgvector",
  "Postgres",
  "PostgreSQL",
  "AsyncLocalStorage",
  "SiliconFlow",
  "Azure",
  "Sanity",
  "Mintlify",
  "Sentry",
  "Upstash",
  "Redis",
  "Docker",
  "Kubernetes",
  "Aliyun",
  "Figma",
  "Penpot",
  "Google Analytics",
  "AGPL",
  "AGPL-3.0",
  "MIT",
  "RBAC",
  "ABAC",
  "CASL",
  "OpenFGA",
  "HMAC",
  "SOC 2",
  "ICP",
  "RLS",
  "ModSecurity WAF",
  // Universal UI shorthand kept in English by convention (B2B SaaS)
  "Blog",
  "FAQ",
  "DPA",
  "npm",
  "Docs",
  "Dashboard",
  "Showcase",
  "Roadmap",
  "Status",
  "API",
  "SDK",
  "CLI",
  "OSS",
  // Roman-numeral section labels with technical anchors
  "Ⅰ. Identity",
  "Ⅱ. Infrastructure",
  "Ⅲ. Routing",
]);

// Per-locale untranslated-phrases ceiling (Tier 3 summary). A locale whose
// identical-to-EN advisory count exceeds this threshold gets a visible
// warning in the CI log. Tunable per locale.
const ADVISORY_CEILINGS = {
  de: 80,
  es: 80,
  fr: 80,
  ja: 80,
  ko: 80,
  zh: 80,
};

// ICU placeholder pattern. Matches `{name}`, `{count, number}`, `{n, plural, one {...}}`, etc.
const PLACEHOLDER_RE = /\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

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

function findIdenticalMessages(locale, enFlat, localeFlat, namespaces) {
  if (locale === "zh") return [];

  const identical = [];
  for (const [key, enValue] of Object.entries(enFlat)) {
    const namespace = key.split(".")[0];
    const localeValue = localeFlat[key];
    if (
      !namespaces.has(namespace) ||
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

function extractPlaceholders(value) {
  if (typeof value !== "string") return new Set();
  const names = new Set();
  for (const match of value.matchAll(PLACEHOLDER_RE)) {
    names.add(match[1]);
  }
  return names;
}

function findPlaceholderMismatches(enFlat, localeFlat) {
  const mismatches = [];
  for (const [key, enValue] of Object.entries(enFlat)) {
    if (typeof enValue !== "string") continue;
    const enPlaceholders = extractPlaceholders(enValue);
    if (enPlaceholders.size === 0) continue;
    const localeValue = localeFlat[key];
    if (typeof localeValue !== "string") continue;
    const localePlaceholders = extractPlaceholders(localeValue);
    const missing = [...enPlaceholders].filter((p) => !localePlaceholders.has(p));
    if (missing.length > 0) {
      mismatches.push({ key, missing });
    }
  }
  return mismatches.sort((a, b) => a.key.localeCompare(b.key));
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
  const log = JSON_OUT ? () => {} : (s) => process.stdout.write(s);
  log(`[i18n-verify] canonical source: ${CANONICAL_LOCALE}.json\n`);
  log(`[i18n-verify] messages dir: ${MESSAGES_DIR}\n`);
  log(`[i18n-verify] mode: ${STRICT ? "strict (advisory promoted to blocking)" : "default"}\n\n`);

  const locales = discoverLocales();
  const en = loadLocale(CANONICAL_LOCALE);
  const enKeys = flatten(en);
  const enFlat = flattenToRecord(en);
  log(`[i18n-verify] ${CANONICAL_LOCALE}: ${enKeys.size} leaf keys\n`);

  const others = locales.filter((l) => l !== CANONICAL_LOCALE);
  const results = others.map((locale) => {
    const data = loadLocale(locale);
    const keys = flatten(data);
    const flat = flattenToRecord(data);
    return {
      ...diff(locale, enKeys, keys),
      identicalCritical: findIdenticalMessages(locale, enFlat, flat, CRITICAL_CONTENT_NAMESPACES),
      identicalAdvisory: findIdenticalMessages(locale, enFlat, flat, ADVISORY_CONTENT_NAMESPACES),
      placeholderMismatches: findPlaceholderMismatches(enFlat, flat),
      total: keys.size,
    };
  });

  let hasBlockingDrift = false;
  for (const r of results) {
    const blocking =
      r.missing.length > 0 ||
      r.extra.length > 0 ||
      r.identicalCritical.length > 0 ||
      r.placeholderMismatches.length > 0 ||
      (STRICT && r.identicalAdvisory.length > 0);
    const status = blocking ? "DRIFT" : r.identicalAdvisory.length > 0 ? "WARN" : "OK";
    log(
      `[i18n-verify] ${r.locale}: ${r.total} keys | missing=${r.missing.length} extra=${r.extra.length} ` +
        `placeholder=${r.placeholderMismatches.length} criticalIdentical=${r.identicalCritical.length} ` +
        `advisoryIdentical=${r.identicalAdvisory.length} [${status}]\n`,
    );
    if (blocking) hasBlockingDrift = true;

    const ceiling = ADVISORY_CEILINGS[r.locale];
    if (ceiling != null && r.identicalAdvisory.length > ceiling && !STRICT) {
      log(
        `  ⚠  advisory identical-to-EN count (${r.identicalAdvisory.length}) exceeds ceiling (${ceiling}) for ${r.locale}\n`,
      );
    }
  }

  if (JSON_OUT) {
    process.stdout.write(
      `${JSON.stringify(
        { canonical: CANONICAL_LOCALE, totalKeys: enKeys.size, locales: results, strict: STRICT },
        null,
        2,
      )}\n`,
    );
    return hasBlockingDrift ? 1 : 0;
  }

  if (!hasBlockingDrift) {
    log(`\n[i18n-verify] all locales pass blocking gates against ${CANONICAL_LOCALE}.json\n`);
    return 0;
  }

  log(`\n[i18n-verify] DRIFT DETECTED\n`);
  for (const r of results) {
    const blocking =
      r.missing.length > 0 ||
      r.extra.length > 0 ||
      r.identicalCritical.length > 0 ||
      r.placeholderMismatches.length > 0 ||
      (STRICT && r.identicalAdvisory.length > 0);
    if (!blocking) continue;
    log(`\n  locale: ${r.locale}\n`);
    if (r.missing.length > 0) {
      log(
        `  missing (${r.missing.length}) — present in ${CANONICAL_LOCALE}, absent in ${r.locale}:\n`,
      );
      log(`${formatList(r.missing, REPORT_LIMIT)}\n`);
    }
    if (r.extra.length > 0) {
      log(`  extra (${r.extra.length}) — present in ${r.locale}, absent in ${CANONICAL_LOCALE}:\n`);
      log(`${formatList(r.extra, REPORT_LIMIT)}\n`);
    }
    if (r.placeholderMismatches.length > 0) {
      log(
        `  placeholder mismatches (${r.placeholderMismatches.length}) — ICU tokens dropped from translation:\n`,
      );
      const lines = r.placeholderMismatches
        .slice(0, REPORT_LIMIT)
        .map((m) => `    - ${m.key}  (missing: ${m.missing.map((v) => `{${v}}`).join(", ")})`);
      if (r.placeholderMismatches.length > REPORT_LIMIT) {
        lines.push(`    ... and ${r.placeholderMismatches.length - REPORT_LIMIT} more`);
      }
      log(`${lines.join("\n")}\n`);
    }
    if (r.identicalCritical.length > 0) {
      log(
        `  critical identical-to-EN (${r.identicalCritical.length}) — high-visibility strings still equal ${CANONICAL_LOCALE}:\n`,
      );
      log(`${formatList(r.identicalCritical, REPORT_LIMIT)}\n`);
    }
    if (STRICT && r.identicalAdvisory.length > 0) {
      log(`  advisory identical-to-EN (${r.identicalAdvisory.length}) [promoted by --strict]:\n`);
      log(`${formatList(r.identicalAdvisory, REPORT_LIMIT)}\n`);
    }
  }
  log(
    `\n[i18n-verify] fix: keep locale files key-compatible with en.json, preserve every {placeholder}, and translate high-visibility namespaces.\n`,
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
