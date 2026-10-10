#!/usr/bin/env node
/**
 * Fill every catalog's untranslated and stale strings through Nebutra Router.
 *
 *   node scripts/i18n-translate.mjs                       all catalogs, all locales
 *   node scripts/i18n-translate.mjs --catalog landing --locale ja --locale de
 *   node scripts/i18n-translate.mjs --dry-run             count the work, call nothing
 *   node scripts/i18n-translate.mjs --max-batches 40      cap a run; the next resumes
 *
 * What gets sent: for each target locale, the keys that are ABSENT from its
 * file (never translated) plus the keys i18n.lock.json lists as stale for it
 * (translated from an English that has since changed). `pnpm i18n:sync` must
 * run first — it is what notices the English moved. Keys the model returns
 * unchanged are recorded in i18n-confirmed-identical.json so they stop
 * coming back. Nothing is ever written that would not pass `pnpm i18n:check`:
 * every leaf is validated (ICU shape, glossary, script) before it lands, and a
 * leaf that fails stays absent and renders in English.
 *
 * Provider — our own Router, never a third-party key (ADR 2026-09-24):
 *   SERVICE_SECRET set   → POST {ROUTER}/api/internal/v1/chat/completions with a
 *                          short-lived service token minted here. The secret
 *                          the gateway and Router already share; nothing new.
 *   ROUTER_API_KEY set   → POST {ROUTER}/v1/chat/completions (a consume key).
 *   I18N_ROUTER_URL      → Router origin, default https://<brand.domains.router>
 *   I18N_TRANSLATE_MODELS → csv model pool, rotated on rate limits
 *
 * Time budget: --deadline-minutes N (or I18N_DEADLINE_MINUTES) stops starting
 * batches after N minutes so a CI job ends before its own timeout.
 * Throughput knobs: LOCALE_CONCURRENCY (2) · CONCURRENCY (4 batches per locale) ·
 * BATCH_SIZE (16 strings per request) · MAX_RETRIES (4) · REQUEST_TIMEOUT_MS.
 */
import { createHmac, randomUUID } from "node:crypto";
import { join } from "node:path";
import { brand } from "../packages/design/brand/src/metadata.ts";
import { CATALOGS } from "./i18n-catalogs.mjs";
import {
  acceptBatchResults,
  chunkByNamespace,
  createModelPool,
  formatGlossaryForPrompt,
  isHardQuotaError,
  namespaceContextLine,
  pLimit,
  splitBatchForRetry,
} from "./i18n-translate-helpers.mjs";
import {
  catalogDir,
  fingerprint,
  flatten,
  isUniversalValue,
  loadConfirmed,
  loadLock,
  readJson,
  saveConfirmed,
  saveLock,
  staleKeys,
  unflatten,
  writeJson,
} from "./lib/i18n-catalog.mjs";
import { describeLocale, SOURCE_LOCALE } from "./lib/i18n-registry.mjs";

// The brand's own Router (brand.domains.router), so a scaffolded project points
// at its Router, not ours.
const ROUTER = (process.env.I18N_ROUTER_URL || `https://${brand.domains.router}`).replace(
  /\/+$/,
  "",
);
const SERVICE_SECRET = process.env.SERVICE_SECRET || "";
const ROUTER_API_KEY = process.env.ROUTER_API_KEY || "";
// deepseek-v4.1-flash is the current DeepSeek flash (v4 is legacy); gpt-5.6-luna is the verified public fallback.
export const DEFAULT_MODELS = ["deepseek/deepseek-v4.1-flash", "gpt-5.6-luna"];
const MODELS = (process.env.I18N_TRANSLATE_MODELS || DEFAULT_MODELS.join(","))
  .split(/[,\s]+/)
  .filter(Boolean);

const LOCALE_CONCURRENCY = Math.max(1, Number(process.env.LOCALE_CONCURRENCY || 2));
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 4));
const BATCH_SIZE = Math.max(1, Number(process.env.BATCH_SIZE || 16));
const MAX_RETRIES = Math.max(1, Number(process.env.MAX_RETRIES || 4));
const REQUEST_TIMEOUT_MS = Math.max(5_000, Number(process.env.REQUEST_TIMEOUT_MS || 90_000));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b64url = (input) => Buffer.from(input).toString("base64url");

/**
 * An HS256 service token in the exact shape @nebutra/auth's signServiceToken
 * mints for a call made on no one's behalf: no claims but iat/exp/jti. Router's
 * internal endpoint accepts that shape (apps/router/src/lib/internal-service.ts).
 */
export function mintServiceToken(secret, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: "HS256" }));
  const payload = b64url(JSON.stringify({ iat: now, jti: randomUUID(), exp: now + 300 }));
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

/** Where to send a chat completion, and with which credential. */
export function routerEndpoint({ serviceSecret, apiKey, origin }) {
  if (serviceSecret) {
    return {
      url: `${origin}/api/internal/v1/chat/completions`,
      headers: () => ({ "x-service-token": mintServiceToken(serviceSecret) }),
      label: "Router internal relay (service token)",
    };
  }
  if (apiKey) {
    return {
      url: `${origin}/v1/chat/completions`,
      headers: () => ({ Authorization: `Bearer ${apiKey}` }),
      label: "Router /v1 (consume key)",
    };
  }
  return null;
}

function parseArgs(argv) {
  const locales = [];
  const catalogs = [];
  let maxBatches = Number.POSITIVE_INFINITY;
  let deadlineMinutes = Number(process.env.I18N_DEADLINE_MINUTES) || Number.POSITIVE_INFINITY;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--locale" && argv[i + 1]) locales.push(argv[++i]);
    if (argv[i] === "--catalog" && argv[i + 1]) catalogs.push(argv[++i]);
    if (argv[i] === "--max-batches" && argv[i + 1]) maxBatches = Number(argv[++i]);
    if (argv[i] === "--deadline-minutes" && argv[i + 1]) deadlineMinutes = Number(argv[++i]);
  }
  return {
    force: argv.includes("--force"),
    dryRun: argv.includes("--dry-run"),
    locales,
    catalogs,
    maxBatches,
    deadlineMinutes,
  };
}

export function buildMessages(targetLocale, entries, styleGuide) {
  return [
    {
      role: "system",
      content: [
        `You are a professional product UI translator for a global SaaS (${brand.name}).`,
        `Translate each JSON string value from English to ${describeLocale(targetLocale)} (${targetLocale}).`,
        namespaceContextLine(entries),
        "Rules:",
        "- Natural, native product tone — concise, never literal machine-translationese.",
        ...(styleGuide ?? []).map((rule) => `- ${rule}`),
        `- Do NOT translate these terms (keep spelling and casing): ${formatGlossaryForPrompt()}.`,
        "- Keep EVERY ICU placeholder and rich-text tag exactly: {name}, {count, plural, …}, <link>…</link>.",
        "  Inside a plural or select, translate the branch text and keep the keywords; plural branches",
        "  may follow the target language's plural rules but must keep `other`.",
        "- Keep quoted ICU literals such as '<T>' exactly, apostrophes included.",
        "- Keep code, paths, commands, URLs and Markdown/HTML structure unchanged.",
        "- zh-Hant: Traditional characters only. zh-Hans: Simplified characters only.",
        "- RTL locales (ar/he/fa/ur): plain text, no bidi control marks.",
        "- Return ONLY a JSON object with the same keys and translated string values. No fences, no commentary.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    { role: "user", content: JSON.stringify(Object.fromEntries(entries)) },
  ];
}

/**
 * Our own credential failed: 401, or Router's 403-shaped `unauthenticated`.
 * Only this aborts a run; every other refusal is per model.
 */
export function isCredentialRefusal(status, bodyText = "") {
  if (status === 401) return true;
  return status === 403 && /"code"\s*:\s*"unauthenticated"|invalid service token/i.test(bodyText);
}

const FAILURE_CAUSES = new Map();
const noteCause = (cause) => FAILURE_CAUSES.set(cause, (FAILURE_CAUSES.get(cause) ?? 0) + 1);

function createTranslator(endpoint) {
  const pool = createModelPool(MODELS);

  async function once(locale, entries, styleGuide) {
    let lastErr;
    for (let attempt = 1; attempt <= Math.max(MAX_RETRIES, MODELS.length * 2); attempt++) {
      let model = pool.pick();
      if (!model) {
        const wait = pool.msUntilAvailable();
        if (wait === null) throw lastErr ?? new Error("every model was rejected by Router");
        await sleep(Math.min(wait + 250, REQUEST_TIMEOUT_MS));
        model = pool.pick();
        if (!model) throw lastErr ?? new Error("all models still benched");
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(endpoint.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...endpoint.headers() },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            max_tokens: Math.min(8192, 128 + entries.length * 160),
            messages: buildMessages(locale, entries, styleGuide),
          }),
          signal: controller.signal,
        });
        const text = await res.text();
        if (isCredentialRefusal(res.status, text)) {
          throw Object.assign(new Error(`Router refused the credential (HTTP ${res.status})`), {
            fatal: true,
          });
        }
        // Any other 403 is the upstream behind Router (New-API answers 403 when
        // a token's quota runs out). It says nothing about our credential, so
        // bench the model and carry on — treating it as fatal threw away a
        // 45-minute run's finished locales on 2026-10-10.
        if (res.status === 403) {
          noteCause(`upstream refused (${model}): ${text.slice(0, 80)}`);
          pool.markExhausted(model, { cooldownMs: 10 * 60_000 });
          lastErr = new Error(`[${model}] upstream 403: ${text.slice(0, 160)}`);
          continue;
        }
        if (res.status === 404 || /model_not_found|unknown model|does not exist/i.test(text)) {
          noteCause(`model ${model} not served`);
          pool.markExhausted(model, { cooldownMs: Number.POSITIVE_INFINITY });
          lastErr = new Error(`[${model}] not served: ${text.slice(0, 160)}`);
          continue;
        }
        if (res.status === 429 || isHardQuotaError(res.status, text)) {
          noteCause(`rate limited (${model})`);
          pool.markExhausted(model, { cooldownMs: 30_000 });
          lastErr = new Error(`[${model}] HTTP ${res.status}`);
          continue;
        }
        if (!res.ok) {
          noteCause(`HTTP ${res.status}`);
          lastErr = new Error(`[${model}] HTTP ${res.status}: ${text.slice(0, 200)}`);
          await sleep(400 * 2 ** Math.min(attempt - 1, 4));
          continue;
        }
        let content = JSON.parse(text)?.choices?.[0]?.message?.content;
        if (typeof content !== "string" || !content.trim()) throw new Error(`[${model}] empty`);
        content = content
          .trim()
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, "");
        const { accepted, rejected } = acceptBatchResults(entries, JSON.parse(content), { locale });
        for (const [, , reason] of rejected) noteCause(`rejected: ${reason.split(" ")[0]}`);
        if (accepted.size === 0) throw new Error(`[${model}] 0 accepted`);
        return { accepted, rejected };
      } catch (err) {
        if (err?.fatal) throw err;
        lastErr = err;
        await sleep(300 * 2 ** Math.min(attempt - 1, 4));
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr ?? new Error("translation failed");
  }

  /** Translate with shrink-on-failure; whatever cannot be validated stays out. */
  async function translate(locale, entries, styleGuide) {
    if (!entries.length) return new Map();
    try {
      const { accepted, rejected } = await once(locale, entries, styleGuide);
      if (!rejected.length) return accepted;
      const retry = rejected.map(([k, src]) => [k, src]);
      if (retry.length === entries.length && entries.length === 1) return accepted;
      const parts = retry.length === entries.length ? splitBatchForRetry(retry) : [retry];
      for (const part of parts) {
        for (const [k, v] of await translate(locale, part, styleGuide)) accepted.set(k, v);
      }
      return accepted;
    } catch (err) {
      if (err?.fatal) throw err;
      const merged = new Map();
      for (const part of splitBatchForRetry(entries)) {
        for (const [k, v] of await translate(locale, part, styleGuide)) merged.set(k, v);
      }
      return merged;
    }
  }

  return { translate };
}

/** Keys a locale needs: absent ones, plus stale ones (or everything with --force). */
export function collectWork(sourceMap, targetMap, stale, { force = false } = {}) {
  const work = [];
  for (const [key, value] of sourceMap) {
    if (typeof value !== "string" || isUniversalValue(value)) continue;
    if (force || !targetMap.has(key) || stale.has(key)) work.push([key, value]);
  }
  return work;
}

async function translateLocale(ctx, catalog, locale, sourceMap, order) {
  const path = join(catalogDir(catalog), `${locale}.json`);
  const targetMap = flatten(readJson(path, {}));
  const stale = staleKeys(ctx.lock, catalog.id, locale);
  const work = collectWork(sourceMap, targetMap, stale, ctx.args);
  const allBatches = chunkByNamespace(work, BATCH_SIZE);
  const batches = allBatches.slice(0, ctx.args.maxBatches);
  if (!work.length) return { translated: 0, pending: 0 };
  process.stdout.write(
    `[${catalog.id}/${locale}] ${work.length} strings (${stale.size} stale) in ${allBatches.length} batches` +
      `${batches.length < allBatches.length ? `, running ${batches.length}` : ""}\n`,
  );
  if (ctx.args.dryRun) return { translated: 0, pending: work.length };

  const limit = pLimit(CONCURRENCY);
  const confirmed = ((ctx.confirmed[catalog.id] ??= {})[locale] ??= {});
  let translated = 0;
  await Promise.all(
    batches.map((batch) =>
      limit(async () => {
        // Past the time budget: start no new batch. The locale still writes
        // what it finished, and the run exits 3 so the PR step runs — a job
        // killed by its own timeout-minutes never reaches that step.
        if (Date.now() >= ctx.deadline) {
          ctx.hitDeadline = true;
          return;
        }
        const accepted = await ctx.translator.translate(locale, batch, catalog.styleGuide);
        for (const [key, value] of accepted) {
          targetMap.set(key, value);
          stale.delete(key);
          if (value === sourceMap.get(key)) confirmed[key] = fingerprint(value);
        }
        translated += accepted.size;
      }),
    ),
  );

  // Written per locale, so a run cut short keeps everything it finished.
  writeJson(path, unflatten(targetMap, order));
  ctx.written += 1;
  const lockStale = (ctx.lock.stale[catalog.id] ??= {});
  lockStale[locale] = [...stale];
  saveLock(ctx.lock);
  saveConfirmed(ctx.confirmed);
  process.stdout.write(`[${catalog.id}/${locale}] +${translated} of ${work.length}\n`);
  return { translated, pending: work.length - translated };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const endpoint = routerEndpoint({
    serviceSecret: SERVICE_SECRET,
    apiKey: ROUTER_API_KEY,
    origin: ROUTER,
  });
  if (!endpoint && !args.dryRun) {
    console.error(
      "No Router credential: set SERVICE_SECRET (CI: the shared service secret) or ROUTER_API_KEY.",
    );
    process.exit(1);
  }
  const ctx = {
    args,
    lock: loadLock(),
    confirmed: loadConfirmed(),
    translator: endpoint ? createTranslator(endpoint) : null,
    written: 0,
    deadline: Date.now() + args.deadlineMinutes * 60_000,
    hitDeadline: false,
  };
  const catalogs = args.catalogs.length
    ? CATALOGS.filter((c) => args.catalogs.includes(c.id))
    : CATALOGS;

  process.stdout.write(
    `i18n translate via ${endpoint?.label ?? "(dry run)"} — ${ROUTER}\n` +
      `  models=${MODELS.join(" → ")} catalogs=${catalogs.map((c) => c.id).join(",")}\n`,
  );

  let translated = 0;
  let pending = 0;
  try {
    for (const catalog of catalogs) {
      const sourceJson = readJson(join(catalogDir(catalog), `${SOURCE_LOCALE}.json`), null);
      if (!sourceJson) continue;
      const sourceMap = flatten(sourceJson);
      const order = [...sourceMap.keys()];
      const authored = new Set(catalog.authoredLocales ?? []);
      const locales = catalog.targets.filter(
        (l) => !authored.has(l) && (!args.locales.length || args.locales.includes(l)),
      );
      const limit = pLimit(LOCALE_CONCURRENCY);
      const results = await Promise.all(
        locales.map((locale) =>
          limit(() => translateLocale(ctx, catalog, locale, sourceMap, order)),
        ),
      );
      for (const r of results) {
        translated += r.translated;
        pending += r.pending;
      }
    }
  } catch (err) {
    if (err?.fatal) {
      console.error(`Aborted: ${err.message}`);
      // Exit 3: stopped early, but the locales finished before the abort are
      // on disk and belong in the PR. Exit 1 only when nothing was written.
      process.exit(ctx.written > 0 ? 3 : 1);
    }
    throw err;
  }

  process.stdout.write(`\nDone. translated=${translated} still untranslated=${pending}\n`);
  for (const [cause, n] of [...FAILURE_CAUSES].sort((a, b) => b[1] - a[1])) {
    process.stdout.write(`  ${String(n).padStart(6)}  ${cause}\n`);
  }
  if (ctx.hitDeadline) {
    process.stdout.write(
      `Time budget of ${args.deadlineMinutes} min reached; the next run resumes.\n`,
    );
    process.exitCode = translated > 0 ? 3 : 2;
  } else if (!args.dryRun && pending > 0 && translated === 0) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
