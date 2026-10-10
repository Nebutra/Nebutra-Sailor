import { icuMismatch } from "./lib/i18n-catalog.mjs";

/**
 * Pure helpers for the i18n translator (scripts/i18n-translate.mjs) — no network.
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
  "Discord",
  "Inngest",
  "LemonSqueezy",
  "Polar",
  "Webhooks",
  "Webhook",
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
  const icu = icuMismatch(source, translated);
  if (icu) return { ok: false, reason: `ICU ${icu}` };
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
  /** model → epoch ms at which it may be retried. */
  const benched = new Map();
  let rr = 0;

  const active = (now = Date.now()) =>
    list.filter((m) => {
      const until = benched.get(m);
      if (until === undefined) return true;
      if (until !== Infinity && now >= until) {
        benched.delete(m);
        return true;
      }
      return false;
    });

  return {
    all: () => [...list],
    remaining: () => active(),
    exhausted: () => [...benched.keys()],
    /**
     * Bench a model instead of retiring it.
     *
     * The plan meters a ROLLING WINDOW ("当前窗口调用余量"), so a model that is
     * out of budget right now is usable again once the window turns. Permanent
     * eviction meant one 4xx cost us that model for the rest of the run: a run
     * stalled with deepseek benched while the dashboard still showed 17.4% of
     * its window unspent.
     *
     * `cooldownMs: Infinity` is for models that will never come back within the
     * run — a 404 model id, not a spent budget.
     */
    markExhausted(model, { cooldownMs = 90_000 } = {}) {
      if (!list.includes(model)) return;
      benched.set(model, cooldownMs === Infinity ? Infinity : Date.now() + cooldownMs);
    },
    /**
     * Milliseconds until a benched model returns, or `null` if the pool can
     * never refill (every model permanently retired). `0` means one is free
     * now. Lets callers wait out a rolling window instead of reporting a
     * failure that only means "not this second".
     */
    msUntilAvailable(now = Date.now()) {
      if (active(now).length > 0) return 0;
      const waits = list
        .map((m) => benched.get(m))
        .filter((u) => u !== undefined && u !== Infinity)
        .map((u) => u - now);
      if (waits.length === 0) return null;
      return Math.max(0, Math.min(...waits));
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
