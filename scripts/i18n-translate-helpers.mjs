import { createHash } from "node:crypto";
/**
 * Pure helpers for SenseNova i18n translator (unit-testable, no network).
 *
 * Engineering upgrades (throughput + quality gates, not full CAT/TM):
 *  - namespace-aware batching
 *  - ICU / double-brace placeholder hard checks
 *  - product glossary (do-not-translate)
 *  - failed-batch auto-shrink
 */

/** Brand / product tokens that must survive translation unchanged (case-sensitive when present). */
export const DEFAULT_GLOSSARY = Object.freeze([
  "Nebutra",
  "Forge",
  "Router",
  "Sailor",
  "Stripe",
  "Clerk",
  "Vercel",
  "OpenAI",
  "GitHub",
  "SenseNova",
  "MCP",
  "API",
  "UUID",
  "JWT",
  "PDF",
  "JSON",
  "YAML",
  "CSV",
  "XML",
  "Cron",
  "LLM",
  "RAG",
  "OAuth",
  "SSO",
  "RBAC",
  "ABAC",
  "OpenFGA",
  "ClickHouse",
  "Prisma",
  "Supabase",
  "Cloudflare",
  "WebSocket",
  "GraphQL",
  "OpenAPI",
  "SaaS",
  // Licence identifiers. These are legal facts, not prose — a mistranslated
  // "FSL-1.1-ALv2" on a pricing page is a licensing claim going wrong, not a
  // wording nit. Bare "MIT" is deliberately absent: `includes` is a
  // case-sensitive substring test, so it would false-positive on "SUBMIT".
  "FSL-1.1-ALv2",
  "Apache-2.0",
  "AGPL-3.0",
  "SPDX",
]);

export function shouldSkipValue(value) {
  if (typeof value !== "string") return true;
  const v = value.trim();
  if (!v) return true;
  if (/^\{[a-zA-Z0-9_.]+\}$/.test(v)) return true;
  if (/^(pnpm|npx|npm|yarn|docker|git|nebutra|create-sailor)\b/i.test(v) && v.length < 80) {
    return true;
  }
  if (/^https?:\/\//i.test(v) || /^[\w.+-]+@[\w.-]+$/.test(v)) return true;
  // Strings that are nothing but licence identifiers ("MIT + FSL-1.1-ALv2").
  // Sending them to a translator can only corrupt them.
  if (
    /^(?:MIT|Apache-2\.0|AGPL-3\.0|FSL-1\.1-ALv2|BSD-[23]-Clause|ISC)(?:\s*[+/·,]\s*(?:MIT|Apache-2\.0|AGPL-3\.0|FSL-1\.1-ALv2|BSD-[23]-Clause|ISC))*$/.test(
      v,
    )
  ) {
    return true;
  }
  if (!/[A-Za-z\u00C0-\u024F\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(v)) return true;
  return false;
}

/**
 * Normalize a `{…}` token to a signature for cross-locale comparison.
 * - simple `{name}` → `{name}`
 * - ICU `{count, plural, one {#} other {# items}}` → `icu:count:plural`
 *   (inner branch wording may be translated; arg name + type must stay)
 * - mustache `{{url}}` → `{{url}}`
 */
export function placeholderSignature(token) {
  if (typeof token !== "string" || !token) return "";
  if (token.startsWith("{{") && token.endsWith("}}")) return token;
  if (token.startsWith("%")) return token;
  if (!(token.startsWith("{") && token.endsWith("}"))) return token;
  const inner = token.slice(1, -1).trim();
  const parts = inner.split(",").map((s) => s.trim());
  if (parts.length >= 2 && /^(plural|select|selectordinal)$/i.test(parts[1])) {
    return `icu:${parts[0]}:${parts[1].toLowerCase()}`;
  }
  // simple arg — ignore accidental whitespace
  if (!inner.includes(",")) return `{${parts[0]}}`;
  // other complex forms: keep arg + second token
  return `icu:${parts[0]}:${(parts[1] || "raw").toLowerCase()}`;
}

/**
 * Extract ICU-style and common template placeholders from a string.
 * Supports: {name}, nested ICU `{count, plural, one {#} other {#}}`, {{mustache}}, %s/%d.
 * Uses brace-balance scan so nested ICU is one token (not shattered).
 * Returned list is **signatures** (see placeholderSignature), sorted.
 */
export function extractPlaceholders(text) {
  if (typeof text !== "string" || !text) return [];
  const raw = [];
  // Mustache {{...}} first
  for (const m of text.matchAll(/\{\{[^{}]+\}\}/g)) raw.push(m[0]);
  // Balanced single-brace tokens
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;
    if (text[i + 1] === "{") {
      const end = text.indexOf("}}", i + 2);
      i = end === -1 ? text.length : end + 1;
      continue;
    }
    let depth = 0;
    for (let j = i; j < text.length; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") {
        depth--;
        if (depth === 0) {
          raw.push(text.slice(i, j + 1));
          i = j;
          break;
        }
      }
    }
  }
  for (const m of text.matchAll(/%\d*\$?[sdif]/g)) raw.push(m[0]);
  return raw.map(placeholderSignature).sort();
}

/** Multiset equality of placeholder **signatures** (order-independent). */
export function placeholdersMatch(source, translated) {
  const a = extractPlaceholders(source);
  const b = extractPlaceholders(translated);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Glossary terms that appear in source must still appear in translation. */
export function glossaryTermsPresent(source, translated, glossary = DEFAULT_GLOSSARY) {
  if (typeof source !== "string" || typeof translated !== "string") return true;
  for (const term of glossary) {
    if (!term) continue;
    if (source.includes(term) && !translated.includes(term)) return false;
  }
  return true;
}

/**
 * Validate a single translated leaf.
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
/**
 * Locales that legitimately use CJK full-width punctuation. Everything else
 * gets it only when the model bleeds its Chinese training register into
 * another script — which it did across ar/bn/fa/hi/ur, 160 marks in one run.
 * "داده‌ها，استفاده" is not a typo a human would make.
 */
const CJK_PUNCT_LOCALES = new Set(["zh", "zh-Hans", "zh-Hant", "zh-CN", "zh-TW", "ja", "ko"]);
const CJK_PUNCT = /[\u3001\u3002\uFF0C\uFF1B\uFF1A\uFF1F\uFF01\uFF08\uFF09]/;

export function validateTranslation(
  source,
  translated,
  { glossary = DEFAULT_GLOSSARY, locale } = {},
) {
  if (typeof translated !== "string" || !translated.trim()) {
    return { ok: false, reason: "empty" };
  }
  if (!placeholdersMatch(source, translated)) {
    return {
      ok: false,
      reason: `placeholder mismatch source=${extractPlaceholders(source).join("|")} got=${extractPlaceholders(translated).join("|")}`,
    };
  }
  if (!glossaryTermsPresent(source, translated, glossary)) {
    return { ok: false, reason: "glossary term dropped" };
  }
  if (/^\s*```/.test(translated)) {
    return { ok: false, reason: "markdown fence leaked" };
  }
  // Only flag punctuation the model introduced — if the English source itself
  // carries a full-width mark, keeping it is correct.
  if (locale && !CJK_PUNCT_LOCALES.has(locale) && CJK_PUNCT.test(translated)) {
    if (!CJK_PUNCT.test(source)) {
      return { ok: false, reason: `CJK punctuation leaked into ${locale}` };
    }
  }
  return { ok: true };
}

/**
 * Accept parsed batch object against requested entries.
 * Drops invalid leaves (caller may shrink-retry those keys).
 * @returns {{ accepted: Map<string,string>, rejected: Array<[string,string,string]> }}
 *   rejected items are [key, source, reason]
 */
export function acceptBatchResults(entries, parsed, options = {}) {
  const accepted = new Map();
  const rejected = [];
  const obj = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  for (const [key, source] of entries) {
    const raw = obj[key];
    if (typeof raw !== "string") {
      rejected.push([key, source, "missing or non-string"]);
      continue;
    }
    const v = validateTranslation(source, raw, options);
    if (!v.ok) {
      rejected.push([key, source, v.reason]);
      continue;
    }
    accepted.set(key, raw);
  }
  return { accepted, rejected };
}

/** First path segment used as UI namespace for context batching. */
export function namespaceOfKey(key) {
  if (typeof key !== "string" || !key) return "_";
  const i = key.indexOf(".");
  return i === -1 ? key : key.slice(0, i);
}

/**
 * Chunk work items by namespace, then into batches of ≤ batchSize.
 * Keeps related UI strings in the same request for better local consistency.
 * @param {Array<[string, string]>} work
 * @param {number} batchSize
 * @returns {Array<Array<[string, string]>>}
 */
export function chunkByNamespace(work, batchSize) {
  const size = Math.max(1, batchSize | 0);
  /** @type {Map<string, Array<[string, string]>>} */
  const groups = new Map();
  for (const item of work) {
    const ns = namespaceOfKey(item[0]);
    if (!groups.has(ns)) groups.set(ns, []);
    groups.get(ns).push(item);
  }
  // Stable namespace order for reproducible logs
  const namespaces = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  const batches = [];
  for (const ns of namespaces) {
    const items = groups.get(ns);
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
  }
  return batches;
}

/** Split a failed batch for shrink-retry (half, min size 1). */
export function splitBatchForRetry(batch) {
  if (!batch || batch.length <= 1) return [];
  const mid = Math.ceil(batch.length / 2);
  return [batch.slice(0, mid), batch.slice(mid)];
}

/** Prompt-ready glossary block. */
export function formatGlossaryForPrompt(glossary = DEFAULT_GLOSSARY) {
  return glossary.join(", ");
}

/** Optional namespace hint for system prompt. */
export function namespaceContextLine(entries) {
  if (!entries?.length) return "";
  const ns = new Set(entries.map(([k]) => namespaceOfKey(k)));
  if (ns.size === 1) {
    return `These strings share UI namespace "${[...ns][0]}" — keep tone and terminology consistent within this group.`;
  }
  return `Namespaces in this batch: ${[...ns].sort().join(", ")}.`;
}

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

export function unflatten(map) {
  const root = {};
  for (const [path, value] of map) {
    const parts = path.split(".");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in cur) || typeof cur[p] !== "object" || cur[p] === null) cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return root;
}

/**
 * Fingerprint an English source string. Confirmations are keyed on this, so
 * editing the English automatically invalidates any prior confirmation and the
 * leaf returns to the queue.
 */
export function sourceFingerprint(value) {
  return createHash("md5").update(String(value)).digest("hex");
}

/**
 * Decide which leaves need a translation call.
 *
 * A leaf still identical to English is normally re-queued — product UI is full
 * of short labels ("Search", "Docs") that a seeded catalog leaves untouched.
 * But some leaves are identical *because that is the correct translation*:
 * "Wallet", "Admin", "RAG", "Audio" are the same word in German. Those were
 * re-sent on every single run forever, never converging — 3,743 leaves of
 * permanent churn across the five catalogs, burning quota to receive the same
 * answer.
 *
 * `confirmedIdentical` is a Map of key → source fingerprint, recorded when a
 * model returns a translation equal to its source. A leaf is skipped only when
 * the fingerprint still matches, so changing the English re-queues it.
 * `force` ignores confirmations entirely.
 */
export function collectWork(sourceMap, targetMap, { force, confirmedIdentical } = {}) {
  const work = [];
  for (const [key, enVal] of sourceMap) {
    if (typeof enVal !== "string" || shouldSkipValue(enVal)) continue;
    const cur = targetMap.get(key);
    const missing = cur === undefined;
    const identical = typeof cur === "string" && cur === enVal && enVal.trim().length > 0;
    if (!force && identical && confirmedIdentical?.get(key) === sourceFingerprint(enVal)) {
      continue;
    }
    if (force || missing || identical) work.push([key, enVal]);
  }
  return work;
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Minimal p-limit (no external dep at repo root). */
export function pLimit(concurrency) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    Promise.resolve()
      .then(fn)
      .then(
        (v) => {
          active--;
          resolve(v);
          next();
        },
        (e) => {
          active--;
          reject(e);
          next();
        },
      );
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
}

/**
 * Default SenseNova Token Plan model pool for product i18n.
 * Prefer multi-model rotation so one exhausted plan does not stall the wheel.
 */
export const DEFAULT_TRANSLATE_MODELS = [
  // deepseek works on Token Plan; u1-fast may 404 on some accounts (auto-skipped).
  // flash-lite kept as last resort for residual capacity.
  "deepseek-v4-flash",
  "sensenova-u1-fast",
  "sensenova-6.7-flash-lite",
];

/**
 * Parse model list from env-style strings.
 * Priority: MODELS (csv) → single MODEL → defaults.
 */
export function parseTranslateModels({
  modelsCsv,
  singleModel,
  defaults = DEFAULT_TRANSLATE_MODELS,
} = {}) {
  const fromCsv = String(modelsCsv ?? "")
    .split(/[,|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromCsv.length > 0) return [...new Set(fromCsv)];
  const one = String(singleModel ?? "").trim();
  if (one) return [one];
  return [...defaults];
}

/**
 * Hard plan/billing quota — model should leave the pool for this run.
 *
 * MUST be gated on an error status. This classifier pattern-matches the
 * response body, and the body of a *successful* translation call contains
 * arbitrary product copy — the catalogs carry 61 occurrences of the word
 * "billing" alone ("Billing", "Open full billing", "Could not load your
 * billing status"). Before the status gate, every 200 that happened to
 * translate one of those strings evicted the model from the pool for the rest
 * of the run. Two of three models would be gone within minutes and the run
 * collapsed with tens of thousands of "failures" against a completely healthy
 * quota.
 */
export function isHardQuotaError(status, bodyText = "") {
  if (typeof status === "number" && status < 400) return false;
  const t = String(bodyText).toLowerCase();
  return (
    t.includes("insufficient_quota") ||
    t.includes("quota_exceeded") ||
    t.includes("quota exceeded") ||
    t.includes("limit exhausted") ||
    t.includes("billing")
  );
}

/**
 * Soft rate-limit / temporary throttle — retry with backoff, do not exhaust
 * the whole model on the first 429 (concurrent bursts often trip this).
 */
export function isSoftRateLimitError(status, bodyText = "") {
  if (status !== 429) return false;
  if (isHardQuotaError(status, bodyText)) return false;
  const t = String(bodyText).toLowerCase();
  return (
    t.includes("rate_limit") ||
    t.includes("rate limit") ||
    t.includes("too many requests") ||
    t.includes("slow down") ||
    // bare 429 with no body still treated as soft
    !t.trim() ||
    true
  );
}

/** @deprecated use isHardQuotaError / isSoftRateLimitError */
export function isQuotaOrRateLimitError(status, bodyText = "") {
  return (
    status === 429 || isHardQuotaError(status, bodyText) || isSoftRateLimitError(status, bodyText)
  );
}

/**
 * Thread-safe-ish model pool for concurrent batch workers.
 * - pick(): round-robin among non-exhausted models
 * - markExhausted(model): drop model from rotation (quota)
 * - remaining(): models still usable
 */
export function createModelPool(models) {
  const list = [...new Set((models ?? []).map((m) => String(m).trim()).filter(Boolean))];
  if (list.length === 0) {
    throw new Error("createModelPool: empty model list");
  }
  const exhausted = new Set();
  let rr = 0;

  const active = () => list.filter((m) => !exhausted.has(m));

  return {
    all: () => [...list],
    remaining: () => active(),
    exhausted: () => [...exhausted],
    markExhausted(model) {
      if (list.includes(model)) exhausted.add(model);
    },
    /** @returns {string | null} */
    pick() {
      const alive = active();
      if (alive.length === 0) return null;
      const model = alive[rr % alive.length];
      rr += 1;
      return model;
    },
  };
}
