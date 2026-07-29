#!/usr/bin/env node
/**
 * verify-i18n-keys.mjs
 *
 * Three-tier i18n integrity check for apps/landing/messages/.
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
import { CATALOGS, catalogById, ENFORCED_LOCALES } from "./i18n-catalogs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// Set per catalog by run(); the checks below read whichever catalog is active.
let MESSAGES_DIR = "";
let CRITICAL_CONTENT_NAMESPACES = new Set();
let ADVISORY_CONTENT_NAMESPACES = new Set();
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

// Namespaces where identical-to-EN is reported as Tier 2 advisory (not
// blocking by default — promoted to blocking under --strict).

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
  // Legal company names — never translated, used verbatim in legal documents
  "Nebutra Co., Ltd.",
  "Wuxi Nebutra Intelligence Technology Co., Ltd.",
  "无锡云毓智能科技有限公司",
  // Numeric metrics — locale-neutral display values
  "47+",
  "104",
  // Cookie technical names — spec-defined identifiers, must not be translated
  "_ga",
  "ph_*",
  "_fbp",
  "_gcl_au",
  "__session",
  "__clerk_db_jwt",
  "cookie_consent",
  "locale",
  "theme",
  // Analytics / ad vendor names — proper nouns
  "PostHog",
  "Facebook",
  "Google Ads",
  // Browser names — proper nouns
  "Chrome",
  "Firefox",
  "Safari",
  "Edge",
  // Web standard storage terms — industry-standard English across all locales
  "Local Storage",
  "Session Storage",
  "Session",
  // Cookie policy table header — standard web term
  "Cookie",
  // Regulatory acronym — kept as-is per GDPR / legal convention
  "DPO",
  // Platform / distribution names
  "Product Hunt",
  "Vercel",
  // CLI command — must not be translated
  "npx create-sailor",
  // Pricing — numeric, currency-prefixed
  "$799",
  // Plan tier badges — all-caps design tokens, not prose
  "ENTERPRISE",
  "STARTUP",
  "INDEPENDENT",
  // Tech stack identifiers with version — proper nouns
  "PostgreSQL + Prisma v7",
  "Clerk Multi-Tenant / Custom Identity",
  // Technical security / DB terms kept in English across B2B SaaS
  "Native Row-Level Security",
  "Row-Level Security",
  // Design system single-word tokens — context is the design tool UI
  "oklch Multi-Theme",
  "Theme",
  "Tokens",
  // Payment provider list — all proper nouns
  "Stripe, LemonSqueezy, Polar & China Pay",
  // SaaS plan tier names — conventionally kept in English
  "Startup",
  "Enterprise",
  "Independent",
  // Standard B2B SaaS nav/footer labels kept in English by convention
  "Marketing",
  "Community",
  "Legal",
  "Support",
  "Contact",
  "Ideas",
  "Cookies",
  "Documentation",
  "Solutions",
  "Infrastructure",
  "Developer Experience",
  "Observability",
  "Communications",
  "Open Source",
  "Startup & Enterprise",
  // Security / legal section labels
  "Security Disclosures",
  // Billing section titles — standard accounting terms
  "Downgrades",
  "Upgrades",
  // microLanding speedometer — single-word phase labels, unit abbreviation, and all-caps heading
  "Init",
  "Core",
  "Scale",
  "Deploy",
  "TIME TO MARKET",
  "mins",
  "Velocity",
  // microLanding speedometer CTAs — short imperative English
  "Skip months of platform work.",
  "Start your timer",
  // microLanding numbered step titles — format "N. Verb" is a design pattern, not prose
  "1. Clone",
  "2. Configure",
  "3. Build",
  "4. Deploy",
  // microLanding step descriptions — contain product-name-dense technical copy
  "Instantly clone the Nebutra monorepo and run pnpm install.",
  "Set up Prisma, Clerk, and Stripe via the interactive CLI in minutes.",
  "Focus on product logic and UI while the platform baseline is already wired.",
  "Push to Vercel and AWS for instant global distribution.",
  // microLanding hero tagline — brand marketing line, kept consistent in EN
  "From zero to production in record time.",
  // Blog / changelog meta titles — brand-name in title, kept consistent
  "Blog — Nebutra",
  "Blog — {brandName}",
  "Changelog — Nebutra",
  "Nebutra Changelog",
  "{brandName}",
  "{brandName} Co., Ltd.",
  "{companyLegal}",
  "{companyLegalEn}",
  // nav brand CTA — "Get Sailed" is Nebutra-specific brand language, not a generic phrase
  "Get Sailed",
  // Legal FAQ heading — intentional EN executive-audience label
  "Executive Deep Dive",
  // Privacy section labels — standard English legal terminology
  "Communications",
  // legalPages.cookies.necessary.cookies.0.duration
  "Session",
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
  "zh-Hans": 80,
  "zh-Hant": 80,
  zh: 80,
};

/**
 * Locales that already ship real above-the-fold translations.
 * New product-wheel locales (pt, ar, hi, …) are en-seeded until SenseNova
 * auto-translate lands — key/placeholder parity still blocks, but
 * critical-identical-to-EN does not (would always fail on pure seeds).
 */
const CRITICAL_IDENTICAL_ENFORCED = new Set(ENFORCED_LOCALES);

// ICU placeholder pattern. Matches `{name}`, `{count, number}`, `{n, plural, one {...}}`.
//
// The trailing `(?=\s*[},])` is load-bearing: an ICU argument name is always
// followed by `}` or `,`. Without it, the sub-message bodies of a plural match
// too — in
//   {count, plural, =0 {No sessions} other {# recent sessions}}
// the branch `{No sessions}` yielded a placeholder called `No`, so the checker
// demanded the English word "No" appear in all 30 translations and reported a
// dropped placeholder in every one of them. That false positive blocked pushes
// on a string that was correctly translated.
const PLACEHOLDER_RE = /\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=[},])/g;

/**
 * Brand-variable placeholder names injected by injectBrandVars() in
 * apps/landing/src/i18n/request.ts at request time — BEFORE next-intl
 * processes the messages. These are not standard ICU runtime placeholders;
 * they are pre-substituted by the brand layer. Exclude them from the
 * placeholder-parity check so that locale files that translate brand-name
 * references differently (e.g. zh.json using {companyLegal} vs en.json using
 * {brandName} for the same company-name field) do not raise false mismatches.
 */
const BRAND_PLACEHOLDER_NAMES = new Set([
  "brandName",
  "brandNameCn",
  "companyLegal",
  "companyLegalEn",
  "productName",
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

function findIdenticalMessages(locale, enFlat, localeFlat, namespaces) {
  // This check used to be skipped entirely for zh-* on the grounds that the
  // different script made it "not apply the same way". That reasoning is
  // backwards, and it cost us: on 2026-07-29 Forge's zh-Hans reported
  // criticalIdentical=0 while 803 of its 1244 runner strings were verbatim
  // English.
  //
  // For a Latin-script locale, a translation coinciding with English is a
  // routine false positive ("Import", "Format"). For Chinese, a value equal to
  // a full English string is the *strongest* available signal that nothing was
  // translated. The exemption was disabling the check precisely where it is
  // most reliable — and on the primary product language.
  //
  // Brand names, tech tokens and short labels are already excluded below by
  // ALLOWED_IDENTICAL_VALUES and the minimum length, which is where the
  // legitimate identical cases belong.
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
    // Exclude brand-variable placeholders — they are pre-substituted by
    // injectBrandVars() before next-intl processes the messages, so they
    // are not ICU runtime variables that need to be parity-checked.
    if (!BRAND_PLACEHOLDER_NAMES.has(match[1])) {
      names.add(match[1]);
    }
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

function runCatalog(catalog) {
  MESSAGES_DIR = join(REPO_ROOT, catalog.messagesDir);
  CRITICAL_CONTENT_NAMESPACES = new Set(catalog.criticalNamespaces ?? []);
  ADVISORY_CONTENT_NAMESPACES = new Set(catalog.advisoryNamespaces ?? []);
  const log = JSON_OUT ? () => {} : (s) => process.stdout.write(s);
  log(`[i18n-verify] catalog: ${catalog.id} — ${catalog.description}\n`);
  log(`[i18n-verify] canonical source: ${CANONICAL_LOCALE}.json\n`);
  log(`[i18n-verify] messages dir: ${catalog.messagesDir}\n`);
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
    const enforceCritical = CRITICAL_IDENTICAL_ENFORCED.has(r.locale);
    const blocking =
      r.missing.length > 0 ||
      r.extra.length > 0 ||
      (enforceCritical && r.identicalCritical.length > 0) ||
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
    const enforceCritical = CRITICAL_IDENTICAL_ENFORCED.has(r.locale);
    const blocking =
      r.missing.length > 0 ||
      r.extra.length > 0 ||
      (enforceCritical && r.identicalCritical.length > 0) ||
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

/**
 * The pre-push hook selects this gate with a glob, and lefthook.yml is YAML —
 * it cannot import the catalog registry. That leaves one unavoidable second
 * copy of the catalog list, so the gate polices its own trigger: add a catalog
 * without widening the hook and this fails, instead of the catalog quietly
 * never being checked on push.
 */
function verifyHookCoverage() {
  let hook;
  try {
    hook = readFileSync(join(REPO_ROOT, "lefthook.yml"), "utf8");
  } catch {
    return []; // no hook file in this checkout — nothing to keep in sync
  }
  const i18nBlock = hook.slice(hook.indexOf("i18n-check:"));
  const globLine = i18nBlock.split("\n").find((l) => l.trim().startsWith("glob:")) ?? "";
  return CATALOGS.filter((c) => !globLine.includes(c.messagesDir)).map((c) => c.messagesDir);
}

function main() {
  const uncovered = verifyHookCoverage();
  if (uncovered.length > 0) {
    process.stderr.write(
      `[i18n-verify] lefthook.yml i18n-check glob does not cover: ${uncovered.join(", ")}\n` +
        "[i18n-verify] add them to the glob so a push touching those files runs this gate.\n",
    );
    return 1;
  }

  const argv = process.argv.slice(2);
  const idx = argv.indexOf("--catalog");
  const selected = idx !== -1 && argv[idx + 1] ? [catalogById(argv[idx + 1])] : CATALOGS;
  let worst = 0;
  for (const catalog of selected) {
    // A catalog that has not been created yet is not a failure — it is a
    // catalog that does not exist. Missing translations in one that DOES
    // exist is what this gate is for.
    try {
      readdirSync(join(REPO_ROOT, catalog.messagesDir));
    } catch {
      if (!JSON_OUT)
        process.stdout.write(`[i18n-verify] catalog: ${catalog.id} — skipped, no messages dir\n\n`);
      continue;
    }
    worst = Math.max(worst, runCatalog(catalog));
  }
  return worst;
}

try {
  process.exit(main());
} catch (err) {
  process.stderr.write(`[i18n-verify] ERROR: ${err.message}\n`);
  process.exit(1);
}
