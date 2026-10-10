/**
 * Shared, network-free rules for the message catalogs: what counts as a
 * translation, a copy, a broken message, and a stale one.
 *
 * One set of rules for the three tools that touch catalogs — `i18n:sync`
 * (normalise), `i18n:translate` (fill) and `i18n:check` (gate). They used to
 * carry their own copies and disagreed: the checker exempted strings the
 * translator would re-send forever, and the seeder wrote the very English
 * copies the checker was meant to catch.
 *
 * The catalog contract:
 *   en.json            the only source
 *   <locale>.json      translations ONLY. A key that is not translated is
 *                      absent; the runtime (@nebutra/i18n/messages) renders the
 *                      English. An English copy is a lie about coverage and is
 *                      rejected by the gate.
 *   i18n.lock.json     per catalog, the md5 of each English string as of the
 *                      last translation pass, and which translations went stale
 *                      when the English changed after it.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@formatjs/icu-messageformat-parser";
import { SOURCE_LOCALE, TARGET_LOCALES } from "./i18n-registry.mjs";

export const REPO_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

// ── Flat maps ────────────────────────────────────────────────────────────────

export function flatten(obj, prefix = "", out = new Map()) {
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== "object" || Array.isArray(obj)) {
    out.set(prefix, obj);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) flatten(v, path, out);
    else out.set(path, v);
  }
  return out;
}

/** Rebuild a nested object, keys in `order` (the English file's order). */
export function unflatten(map, order) {
  const root = {};
  const keys = order ? order.filter((k) => map.has(k)) : [...map.keys()];
  for (const path of keys) {
    const parts = path.split(".");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in cur) || typeof cur[p] !== "object" || cur[p] === null) cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = map.get(path);
  }
  return root;
}

/** md5 of an English string — the key confirmations are filed under. */
export function fingerprint(value) {
  return createHash("md5").update(String(value)).digest("hex");
}

/** Short form for the source lock: 8 hex chars is plenty to notice an edit. */
export function shortFingerprint(value) {
  return fingerprint(value).slice(0, 8);
}

// ── ICU ──────────────────────────────────────────────────────────────────────

/**
 * Placeholders the landing request layer substitutes before next-intl sees the
 * message (apps/landing/src/i18n/request.ts brandVars). A translation may name
 * the company differently ({companyLegal} for {brandName}), so they are not
 * compared.
 */
export const BRAND_PLACEHOLDERS = new Set([
  "brandName",
  "brandNameUpper",
  "brandNameCn",
  "companyLegal",
  "companyLegalEn",
  "productName",
  "domain",
]);

const TYPE = ["literal", "arg", "number", "date", "time", "select", "plural", "pound", "tag"];

/**
 * The shape a translation must keep: the set of arguments it references and
 * the rich-text tags it opens. How an argument is formatted is the
 * translator's call — Chinese writes `共 {count} 个用户` where English needs
 * `{count, plural, …}` — but a dropped `{name}` renders a hole and an unknown
 * `<tag>` throws in `t.rich`.
 *
 * Returns `{ ok: true, shape }` or `{ ok: false, error }` when the string is not
 * valid ICU (including a plural without its required `other` branch) —
 * next-intl renders such a message as its key path, so an invalid message is a
 * visible bug in any locale, English included.
 */
export function icuShape(text) {
  let ast;
  try {
    ast = parse(text);
  } catch (error) {
    return { ok: false, error: error?.message ?? String(error) };
  }
  const shape = new Set();
  const walk = (nodes) => {
    for (const node of nodes) {
      const type = TYPE[node.type];
      if (type === "tag") {
        shape.add(`<${node.value}>`);
        walk(node.children);
      } else if (type === "select" || type === "plural") {
        if (type === "plural" && !node.options.other) {
          throw Object.assign(new Error(`plural {${node.value}} has no "other" branch`), {
            icu: true,
          });
        }
        if (!BRAND_PLACEHOLDERS.has(node.value)) shape.add(`{${node.value}}`);
        for (const option of Object.values(node.options)) walk(option.value);
      } else if (type !== "literal" && type !== "pound") {
        if (!BRAND_PLACEHOLDERS.has(node.value)) shape.add(`{${node.value}}`);
      }
    }
  };
  try {
    walk(ast);
  } catch (error) {
    if (error?.icu) return { ok: false, error: error.message };
    throw error;
  }
  return { ok: true, shape: [...shape].sort() };
}

/** Why `translated` cannot stand in for `source`, or null when it can. */
export function icuMismatch(source, translated) {
  const a = icuShape(source);
  if (!a.ok) return null; // a broken source is reported against en.json, not here
  const b = icuShape(translated);
  if (!b.ok) return `invalid ICU: ${b.error}`;
  const want = a.shape.join(" ");
  const got = b.shape.join(" ");
  return want === got ? null : `expected ${want || "no placeholders"}, got ${got || "none"}`;
}

// ── Copies ───────────────────────────────────────────────────────────────────

/**
 * Values that read the same in every language: proper nouns, product and
 * technology names, identifiers, licence ids. Prose never belongs here — a
 * sentence that "stays English" is an untranslated sentence. Anything not on
 * this list that a model returns unchanged is recorded per key in
 * i18n-confirmed-identical.json instead, with the English fingerprint, so the
 * exemption lapses when the English changes.
 */
export const UNIVERSAL_VALUES = new Set([
  // Company / product
  "Nebutra",
  "Nebutra Sailor",
  "Sailor",
  "Forge",
  "Router",
  "Forge 工具站",
  "Nebutra Co., Ltd.",
  "Wuxi Nebutra Intelligence Technology Co., Ltd.",
  "无锡云毓智能科技有限公司",
  "{brandName}",
  "{brandName} Co., Ltd.",
  "{companyLegal}",
  "{companyLegalEn}",
  // Platforms and vendors
  "GitHub",
  "GitHub Issues",
  "Discord",
  "Slack",
  "X (Twitter)",
  "Product Hunt",
  "Vercel",
  "PostHog",
  "Facebook",
  "Google Ads",
  "Google Analytics",
  "Chrome",
  "Firefox",
  "Safari",
  "Edge",
  // Frameworks, libraries, infrastructure
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
  "Creem",
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
  "PostgreSQL + Prisma v7",
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
  // Acronyms and identifiers
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
  "DPA",
  "DPO",
  "FAQ",
  "API",
  "SDK",
  "CLI",
  "OSS",
  "npm",
  "npx create-sailor",
  // Cookie and storage identifiers
  "_ga",
  "ph_*",
  "_fbp",
  "_gcl_au",
  "__session",
  "__clerk_db_jwt",
  "cookie_consent",
  "locale",
  "theme",
]);

/**
 * Exact English leaves that must stay English in every locale — a translation
 * of one is dropped by `i18n:sync` ("الخطافات" for Webhooks shipped once).
 * Brand / protocol / product names only — not generic UI words like Theme/FAQ
 * (those legitimately localize to 主题 / Preguntas frecuentes / …).
 */
export const BRAND_TERMS = new Set([
  "Discord",
  "Webhooks",
  "Webhook",
  "X (Twitter)",
  "GitHub",
  "Stripe",
  "Clerk",
  "MCP",
  "JSON",
  "YAML",
  "OpenAI",
  "Vercel",
  "SaaS",
  "OAuth",
  "SSO",
  "JWT",
  "UUID",
  "Nebutra",
  "Forge",
  "Router",
  "Sailor",
  "Inngest",
  "LemonSqueezy",
  "Polar",
  "SenseNova",
  "ClickHouse",
  "Prisma",
  "Supabase",
  "Cloudflare",
  "GraphQL",
  "OpenAPI",
  "OpenFGA",
  "FSL-1.1-ALv2",
  "Apache-2.0",
  "AGPL-3.0",
]);

/**
 * True when a target value equal to the English source is legitimate: a
 * universal value, nothing a translator could change (URLs, numbers, bare
 * placeholders, commands), or a two-letter fragment.
 */
export function isUniversalValue(value) {
  if (typeof value !== "string") return true;
  const v = value.trim();
  if (v.length < 3 || UNIVERSAL_VALUES.has(v) || BRAND_TERMS.has(v)) return true;
  if (/^\{[a-zA-Z0-9_.]+\}$/.test(v)) return true;
  if (/^(pnpm|npx|npm|yarn|docker|git|nebutra|create-sailor)\b/i.test(v) && v.length < 80) {
    return true;
  }
  if (/^https?:\/\//i.test(v) || /^[\w.+-]+@[\w.-]+$/.test(v)) return true;
  if (
    /^(?:MIT|Apache-2\.0|AGPL-3\.0|FSL-1\.1-ALv2|BSD-[23]-Clause|ISC)(?:\s*[+/·,]\s*(?:MIT|Apache-2\.0|AGPL-3\.0|FSL-1\.1-ALv2|BSD-[23]-Clause|ISC))*$/.test(
      v,
    )
  ) {
    return true;
  }
  // Nothing translatable: digits, symbols, units.
  if (!/[A-Za-zÀ-ɏ一-鿿぀-ヿ가-힯]/.test(v)) return true;
  return false;
}

/**
 * Nothing in it a translator could change — digits, symbols, units ("111",
 * "47+", "99.9%"). A target value for one of these that differs from the
 * source is a leftover from older English, not a localisation: 28 locales
 * still said "104" packages after the English moved to "111".
 */
export function isUntranslatable(value) {
  return (
    typeof value === "string" &&
    !/[A-Za-z\u00C0-\u024F\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(value)
  );
}

/** Is `value` (in `locale`) an English copy rather than a translation? */
export function isEnglishCopy(source, value, confirmedFingerprint) {
  if (typeof source !== "string" || typeof value !== "string") return false;
  if (value.trim() !== source.trim()) return false;
  if (isUniversalValue(source)) return false;
  return confirmedFingerprint !== fingerprint(source);
}

// ── Catalog files ────────────────────────────────────────────────────────────

export function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function catalogDir(catalog) {
  return resolve(REPO_ROOT, catalog.messagesDir);
}

/** Locale ids of the JSON files present in a catalog directory. */
export function localeFiles(catalog) {
  return readdirSync(catalogDir(catalog))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .sort();
}

/** Files that are neither the source nor a product language (`zh.json`). */
export function strayLocaleFiles(catalog) {
  const known = new Set([SOURCE_LOCALE, ...TARGET_LOCALES]);
  return localeFiles(catalog).filter((l) => !known.has(l));
}

export function loadFlat(catalog, locale) {
  return flatten(readJson(join(catalogDir(catalog), `${locale}.json`), {}));
}

// ── Confirmed-identical store ────────────────────────────────────────────────

const CONFIRMED_PATH = join(REPO_ROOT, "i18n-confirmed-identical.json");

export function loadConfirmed() {
  const raw = readJson(CONFIRMED_PATH, null);
  return raw?.confirmed && typeof raw.confirmed === "object" ? raw.confirmed : {};
}

export function confirmedFor(store, catalogId, locale) {
  return new Map(Object.entries(store?.[catalogId]?.[locale] ?? {}));
}

function sortDeep(o) {
  return Object.fromEntries(
    Object.entries(o)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, v && typeof v === "object" && !Array.isArray(v) ? sortDeep(v) : v]),
  );
}

export function saveConfirmed(store) {
  writeJson(CONFIRMED_PATH, {
    version: 1,
    note: "Leaves whose correct translation equals the English source. Values are md5 of the English string, so editing the English re-queues the leaf. Written by scripts/i18n-translate.mjs; safe to delete (costs one re-translation).",
    confirmed: sortDeep(store),
  });
}

// ── Source lock ──────────────────────────────────────────────────────────────

const LOCK_PATH = join(REPO_ROOT, "i18n.lock.json");

/**
 * `{ sources: { [catalog]: { [key]: md5 } }, stale: { [catalog]: { [locale]: key[] } } }`
 *
 * `sources` is the English each translation was made from. When en.json moves
 * past it, every existing translation of that key is stale: it still renders
 * (an outdated translation beats English mid-sentence) but it is queued for
 * re-translation. The lock only ever moves forward in `i18n:sync`.
 */
export function loadLock() {
  const raw = readJson(LOCK_PATH, {});
  return { version: 1, sources: raw.sources ?? {}, stale: raw.stale ?? {} };
}

export function saveLock(lock) {
  const stale = {};
  for (const [catalog, byLocale] of Object.entries(lock.stale)) {
    const kept = Object.entries(byLocale)
      .filter(([, keys]) => keys.length > 0)
      .map(([locale, keys]) => [locale, [...new Set(keys)].sort()]);
    if (kept.length) stale[catalog] = Object.fromEntries(kept);
  }
  writeJson(LOCK_PATH, {
    version: 1,
    note: "md5 of each English string as of the last translation pass, and the translations that went stale since. Maintained by scripts/i18n-sync.mjs and scripts/i18n-translate.mjs — do not hand-edit.",
    sources: sortDeep(lock.sources),
    stale: sortDeep(stale),
  });
}

export function staleKeys(lock, catalogId, locale) {
  return new Set(lock.stale?.[catalogId]?.[locale] ?? []);
}
