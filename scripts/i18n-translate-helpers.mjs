/**
 * Pure helpers for SenseNova i18n translator (unit-testable, no network).
 */

export function shouldSkipValue(value) {
  if (typeof value !== "string") return true;
  const v = value.trim();
  if (!v) return true;
  if (/^\{[a-zA-Z0-9_.]+\}$/.test(v)) return true;
  if (/^(pnpm|npx|npm|yarn|docker|git|nebutra|create-sailor)\b/i.test(v) && v.length < 80) {
    return true;
  }
  if (/^https?:\/\//i.test(v) || /^[\w.+-]+@[\w.-]+$/.test(v)) return true;
  if (!/[A-Za-z\u00C0-\u024F\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(v)) return true;
  return false;
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

export function collectWork(sourceMap, targetMap, { force } = {}) {
  const work = [];
  for (const [key, enVal] of sourceMap) {
    if (typeof enVal !== "string" || shouldSkipValue(enVal)) continue;
    const cur = targetMap.get(key);
    const missing = cur === undefined;
    // Product UI is full of short labels ("Search", "Docs") — still retranslate
    // any leaf that remains identical to English.
    const identical = typeof cur === "string" && cur === enVal && enVal.trim().length > 0;
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

/** Hard plan/billing quota — model should leave the pool for this run. */
export function isHardQuotaError(status, bodyText = "") {
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
