#!/usr/bin/env node
/**
 * Monorepo-wide concurrent i18n translator (SenseNova Token Plan).
 *
 * Covers every product message catalog that ships UI strings for global locales:
 *   - apps/landing/messages              (marketing — PRODUCT_LANGUAGES wheel)
 *   - packages/platform/i18n/locales     (dashboard/web shared — full wheel)
 *   - apps/tsekaluk-dev/messages         (portfolio — full wheel)
 *   - apps/forge/messages                (online tools — full wheel)
 *   - apps/router/messages               (API marketplace — full wheel)
 *
 * Official API:
 *   POST https://token.sensenova.cn/v1/chat/completions
 *   Models (rotate): sensenova-6.7-flash-lite, sensenova-u1-fast, deepseek-v4-flash
 *   thinking: { type: "disabled" }
 *   Docs: https://github.com/OpenSenseNova/SenseNova6.7/blob/main/API_CN.md
 *
 * Model pool:
 *   SENSENOVA_TRANSLATE_MODELS=csv   preferred multi-model list (round-robin)
 *   SENSENOVA_TRANSLATE_MODEL=one    single-model override when MODELS unset
 *   On 429/quota for a model, mark exhausted and rotate to the next.
 *
 * Quality / batching:
 *   - Namespace-aware batches (related UI keys travel together)
 *   - BATCH_SIZE leaves per request (default 20; CI ~12)
 *   - ICU placeholder + glossary hard validation per leaf
 *   - Failed / partial batches auto-shrink (half → … → 1) and retry
 *
 * Concurrency (defaults tuned for Token Plan + GH runners):
 *   CATALOG_CONCURRENCY=3   catalogs in parallel
 *   LOCALE_CONCURRENCY=6    locales per catalog in parallel
 *   CONCURRENCY=24          batches per locale in parallel
 *   BATCH_SIZE=20           leaf strings per API request
 *
 * Usage (repo root):
 *   SENSENOVA_API_KEY=sk-... node scripts/i18n-translate-sensenova.mjs
 *   SENSENOVA_API_KEY=sk-... node scripts/i18n-translate-sensenova.mjs --force
 *   SENSENOVA_API_KEY=sk-... node scripts/i18n-translate-sensenova.mjs --catalog landing --locale zh
 *   SENSENOVA_API_KEY=sk-... node scripts/i18n-translate-sensenova.mjs --dry-run
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  acceptBatchResults,
  chunkByNamespace,
  collectWork,
  createModelPool,
  flatten,
  formatGlossaryForPrompt,
  isHardQuotaError,
  isSoftRateLimitError,
  namespaceContextLine,
  parseTranslateModels,
  pLimit,
  splitBatchForRetry,
  unflatten,
} from "./i18n-translate-helpers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

/**
 * Global product language wheel targets (minus en).
 * Keep in sync with packages/platform/i18n PRODUCT_LANGUAGES.
 * Chinese is CLDR script-split: zh-Hans + zh-Hant (not bare zh).
 */
const GLOBAL_TARGETS = [
  "zh-Hans",
  "zh-Hant",
  "de",
  "es",
  "fr",
  "ja",
  "ko",
  "pt",
  "it",
  "nl",
  "sv",
  "da",
  "fi",
  "no",
  "pl",
  "cs",
  "ro",
  "hu",
  "el",
  "ru",
  "uk",
  "tr",
  "ar",
  "he",
  "fa",
  "hi",
  "bn",
  "ur",
  "th",
  "vi",
  "id",
  "ms",
  "sw",
];

const CATALOGS = [
  {
    id: "landing",
    messagesDir: "apps/landing/messages",
    source: "en",
    targets: GLOBAL_TARGETS,
    description: "Public marketing site",
  },
  {
    id: "web",
    messagesDir: "packages/platform/i18n/locales",
    source: "en",
    targets: GLOBAL_TARGETS,
    description: "Dashboard / authenticated product (shared @nebutra/i18n)",
  },
  {
    id: "tsekaluk-dev",
    messagesDir: "apps/tsekaluk-dev/messages",
    source: "en",
    targets: GLOBAL_TARGETS,
    description: "Portfolio / personal site",
  },
  {
    id: "forge",
    messagesDir: "apps/forge/messages",
    source: "en",
    targets: GLOBAL_TARGETS,
    description: "Forge online tool station",
  },
  {
    id: "router",
    messagesDir: "apps/router/messages",
    source: "en",
    targets: GLOBAL_TARGETS,
    description: "Router API marketplace",
  },
];

const API_BASE = (process.env.SENSENOVA_BASE_URL || "https://token.sensenova.cn/v1").replace(
  /\/$/,
  "",
);
const MODELS = parseTranslateModels({
  modelsCsv: process.env.SENSENOVA_TRANSLATE_MODELS,
  singleModel: process.env.SENSENOVA_TRANSLATE_MODEL,
});
const modelPool = createModelPool(MODELS);
const API_KEY = process.env.SENSENOVA_API_KEY || process.env.OPENAI_API_KEY;

const CATALOG_CONCURRENCY = Math.max(1, Number(process.env.CATALOG_CONCURRENCY || 3));
const LOCALE_CONCURRENCY = Math.max(1, Number(process.env.LOCALE_CONCURRENCY || 6));
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 24));
const BATCH_SIZE = Math.max(1, Number(process.env.BATCH_SIZE || 20));
const MAX_RETRIES = Math.max(1, Number(process.env.MAX_RETRIES || 4));
const REQUEST_TIMEOUT_MS = Math.max(5_000, Number(process.env.REQUEST_TIMEOUT_MS || 60_000));

const LOCALE_NAMES = {
  "zh-Hans": "Simplified Chinese (简体中文)",
  "zh-Hant": "Traditional Chinese (繁體中文)",
  ja: "Japanese",
  ko: "Korean",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  nl: "Dutch",
  sv: "Swedish",
  da: "Danish",
  fi: "Finnish",
  no: "Norwegian",
  pl: "Polish",
  cs: "Czech",
  ro: "Romanian",
  hu: "Hungarian",
  el: "Greek",
  ru: "Russian",
  uk: "Ukrainian",
  tr: "Turkish",
  ar: "Arabic",
  he: "Hebrew",
  fa: "Persian",
  hi: "Hindi",
  bn: "Bengali",
  ur: "Urdu",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  ms: "Malay",
  sw: "Swahili",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  const force = argv.includes("--force");
  const dryRun = argv.includes("--dry-run");
  const locales = [];
  const catalogs = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--locale" && argv[i + 1]) locales.push(argv[++i]);
    if (argv[i] === "--catalog" && argv[i + 1]) catalogs.push(argv[++i]);
  }
  return { force, dryRun, locales, catalogs };
}

function buildTranslateBody(model, targetLocale, entries) {
  const targetName = LOCALE_NAMES[targetLocale] || targetLocale;
  const payload = Object.fromEntries(entries);
  const nsLine = namespaceContextLine(entries);
  return {
    model,
    temperature: 0.2,
    max_tokens: Math.min(8192, 64 + entries.length * 140),
    thinking: { type: "disabled" },
    messages: [
      {
        role: "system",
        content: [
          `You are a professional product UI translator for a global SaaS (Nebutra).`,
          `Translate each JSON string value from English to ${targetName} (${targetLocale}).`,
          nsLine,
          `Rules:`,
          `- Natural product UI tone — concise, native, not literal machine-translationese.`,
          `- Do NOT translate glossary tokens (keep exact spelling/casing): ${formatGlossaryForPrompt()}.`,
          `- Preserve EVERY placeholder EXACTLY as in the source (same spelling, braces, order):`,
          `  ICU {name}, {count, plural, …}, mustache {{var}}, and printf %s/%d.`,
          `- Preserve HTML/Markdown/code spans, file paths, and punctuation structure.`,
          `- For zh-Hant use Traditional Chinese characters (繁體), never Simplified.`,
          `- For zh-Hans use Simplified Chinese characters (简体), never Traditional.`,
          `- For RTL locales (ar/he/fa/ur) return plain translated text only (no bidi marks).`,
          `- Return ONLY a valid JSON object with the SAME keys and translated string values.`,
          `- No markdown fences, no commentary, no extra keys.`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
      { role: "user", content: JSON.stringify(payload) },
    ],
  };
}

/**
 * Single network attempt for a batch (multi-model rotation inside).
 * Returns raw accepted map after placeholder/glossary validation.
 * Throws if nothing usable after model pool retries.
 */
async function translateBatchOnce(targetLocale, entries) {
  let lastErr;
  const maxAttempts = Math.max(MAX_RETRIES, MODELS.length * 2);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const model = modelPool.pick();
    if (!model) {
      throw lastErr ?? new Error("all translate models exhausted (quota/rate-limit)");
    }

    const body = buildTranslateBody(model, targetLocale, entries);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await res.text();
      if (isHardQuotaError(res.status, text)) {
        modelPool.markExhausted(model);
        lastErr = new Error(`[${model}] HTTP ${res.status} hard-quota: ${text.slice(0, 180)}`);
        process.stderr.write(
          `  model ${model} hard-quota exhausted; remaining=[${modelPool.remaining().join(",") || "none"}]\n`,
        );
        continue;
      }
      if (isSoftRateLimitError(res.status, text) || res.status === 429) {
        lastErr = new Error(`[${model}] HTTP ${res.status} rate-limit: ${text.slice(0, 180)}`);
        const wait = Math.min(8_000, 600 * 2 ** Math.min(attempt - 1, 4) + Math.random() * 400);
        process.stderr.write(`  model ${model} rate-limited; backoff ${Math.round(wait)}ms\n`);
        await sleep(wait);
        continue;
      }
      if (res.status >= 500) {
        lastErr = new Error(`[${model}] HTTP ${res.status}: ${text.slice(0, 200)}`);
        await sleep(400 * 2 ** Math.min(attempt - 1, 4) + Math.random() * 200);
        continue;
      }
      if (!res.ok) throw new Error(`[${model}] HTTP ${res.status}: ${text.slice(0, 400)}`);
      const data = JSON.parse(text);
      let content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error(`[${model}] empty content: ${text.slice(0, 300)}`);
      }
      content = content.trim();
      if (content.startsWith("```")) {
        content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      }
      const parsed = JSON.parse(content);
      const { accepted, rejected } = acceptBatchResults(entries, parsed);
      if (accepted.size === 0) {
        const reason = rejected[0]?.[2] ?? "empty";
        throw new Error(`[${model}] 0 accepted leaves (${reason})`);
      }
      return { accepted, rejected, model };
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (
        /HTTP 404|model_not_found|does not exist|invalid_model|unknown model|model is not found/i.test(
          msg,
        )
      ) {
        modelPool.markExhausted(model);
        process.stderr.write(
          `  model ${model} unavailable; remaining=[${modelPool.remaining().join(",") || "none"}]\n`,
        );
        continue;
      }
      if (attempt < maxAttempts) {
        await sleep(300 * 2 ** Math.min(attempt - 1, 4) + Math.random() * 150);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error("translateBatchOnce failed");
}

/**
 * Translate a batch with quality gates + auto-shrink on failure / partial reject.
 * @returns {Promise<{ accepted: Map<string,string>, failed: Array<[string,string]> }>}
 */
async function translateBatchWithShrink(targetLocale, entries, depth = 0) {
  if (!entries.length) return { accepted: new Map(), failed: [] };

  try {
    const { accepted, rejected } = await translateBatchOnce(targetLocale, entries);

    // Full success
    if (rejected.length === 0) {
      return { accepted, failed: [] };
    }

    // Partial: keep good leaves; shrink-retry rejected only
    const retryEntries = rejected.map(([k, src]) => [k, src]);
    if (retryEntries.length === entries.length && entries.length === 1) {
      // Single leaf still bad after accept — hard fail that key
      return { accepted, failed: retryEntries };
    }

    if (retryEntries.length === entries.length) {
      // Entire batch rejected by validation → shrink
      const halves = splitBatchForRetry(entries);
      if (halves.length === 0) {
        return { accepted, failed: entries };
      }
      const merged = new Map(accepted);
      const failed = [];
      for (const half of halves) {
        const sub = await translateBatchWithShrink(targetLocale, half, depth + 1);
        for (const [k, v] of sub.accepted) merged.set(k, v);
        failed.push(...sub.failed);
      }
      return { accepted: merged, failed };
    }

    // Partial reject → retry only rejects (as one smaller batch, then shrink)
    const sub = await translateBatchWithShrink(targetLocale, retryEntries, depth + 1);
    const merged = new Map(accepted);
    for (const [k, v] of sub.accepted) merged.set(k, v);
    return { accepted: merged, failed: sub.failed };
  } catch (err) {
    // Network / model failure: shrink if possible
    const halves = splitBatchForRetry(entries);
    if (halves.length === 0) {
      return { accepted: new Map(), failed: entries };
    }
    if (depth === 0) {
      process.stderr.write(
        `  batch size=${entries.length} failed (${err instanceof Error ? err.message : err}); shrinking\n`,
      );
    }
    const merged = new Map();
    const failed = [];
    for (const half of halves) {
      const sub = await translateBatchWithShrink(targetLocale, half, depth + 1);
      for (const [k, v] of sub.accepted) merged.set(k, v);
      failed.push(...sub.failed);
    }
    return { accepted: merged, failed };
  }
}

/** Smoke / simple batch helper used by main smoke check. */
async function translateBatch(targetLocale, entries) {
  const { accepted } = await translateBatchWithShrink(targetLocale, entries);
  return accepted;
}

async function translateLocale(catalog, targetLocale, sourceMap, { force, dryRun }) {
  const dir = join(REPO_ROOT, catalog.messagesDir);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${targetLocale}.json`);
  const sourcePath = join(dir, `${catalog.source}.json`);

  // Seed missing target files from English so key shape exists before fill
  if (!existsSync(path) && existsSync(sourcePath)) {
    writeFileSync(path, readFileSync(sourcePath, "utf8"));
    process.stdout.write(`[${catalog.id}/${targetLocale}] seeded from ${catalog.source}.json\n`);
  }

  const existing = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  const targetMap = flatten(existing);
  const work = collectWork(sourceMap, targetMap, { force });

  if (work.length === 0) {
    process.stdout.write(`[${catalog.id}/${targetLocale}] up-to-date (0 jobs)\n`);
    return { catalog: catalog.id, locale: targetLocale, translated: 0, failed: 0 };
  }

  const batches = chunkByNamespace(work, BATCH_SIZE);
  process.stdout.write(
    `[${catalog.id}/${targetLocale}] ${work.length} strings → ${batches.length} ns-batches (≤${BATCH_SIZE}) @ concurrency=${CONCURRENCY}\n`,
  );

  if (dryRun) {
    return {
      catalog: catalog.id,
      locale: targetLocale,
      translated: work.length,
      failed: 0,
      dryRun: true,
    };
  }

  const limit = pLimit(CONCURRENCY);
  let translated = 0;
  let failed = 0;
  const updates = new Map();

  await Promise.all(
    batches.map((batch, idx) =>
      limit(async () => {
        const { accepted, failed: failedEntries } = await translateBatchWithShrink(
          targetLocale,
          batch,
        );
        for (const [k, v] of accepted) updates.set(k, v);
        translated += accepted.size;
        for (const [k, en] of failedEntries) {
          failed += 1;
          // Keep English seed for missing keys so shape stays valid
          if (!targetMap.has(k) && !updates.has(k)) updates.set(k, en);
        }
        if ((idx + 1) % 5 === 0 || idx === batches.length - 1) {
          process.stdout.write(
            `  [${catalog.id}/${targetLocale}] batch ${idx + 1}/${batches.length} (+${accepted.size}${failedEntries.length ? ` fail=${failedEntries.length}` : ""})\n`,
          );
        }
      }),
    ),
  );

  const merged = new Map(sourceMap);
  for (const [k, v] of targetMap) {
    if (merged.has(k) && typeof v === "string") merged.set(k, v);
  }
  for (const [k, v] of updates) {
    if (merged.has(k)) merged.set(k, v);
  }

  writeFileSync(path, `${JSON.stringify(unflatten(merged), null, 2)}\n`, "utf8");
  process.stdout.write(
    `[${catalog.id}/${targetLocale}] wrote ${path} (translated=${translated}, failed=${failed})\n`,
  );
  return { catalog: catalog.id, locale: targetLocale, translated, failed };
}

async function translateCatalog(catalog, args) {
  const dir = join(REPO_ROOT, catalog.messagesDir);
  const sourcePath = join(dir, `${catalog.source}.json`);
  if (!existsSync(sourcePath)) {
    process.stderr.write(`[${catalog.id}] skip — missing source ${sourcePath}\n`);
    return [];
  }
  const source = JSON.parse(readFileSync(sourcePath, "utf8"));
  const sourceMap = flatten(source);

  let targets = catalog.targets;
  if (args.locales.length) {
    targets = targets.filter((t) => args.locales.includes(t));
  }
  if (!targets.length) return [];

  process.stdout.write(
    `\n## catalog=${catalog.id} (${catalog.description})\n` +
      `   path=${catalog.messagesDir} leaves=${sourceMap.size} targets=${targets.join(",")}\n`,
  );

  const localeLimit = pLimit(LOCALE_CONCURRENCY);
  return Promise.all(
    targets.map((locale) => localeLimit(() => translateLocale(catalog, locale, sourceMap, args))),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!API_KEY && !args.dryRun) {
    console.error("Missing SENSENOVA_API_KEY (or OPENAI_API_KEY).");
    process.exit(1);
  }

  let catalogs = CATALOGS;
  if (args.catalogs.length) {
    catalogs = CATALOGS.filter((c) => args.catalogs.includes(c.id));
    if (!catalogs.length) {
      console.error(`Unknown --catalog. Known: ${CATALOGS.map((c) => c.id).join(", ")}`);
      process.exit(1);
    }
  }

  process.stdout.write(
    [
      `SenseNova Token Plan — global i18n translator`,
      `  base=${API_BASE}`,
      `  models=${MODELS.join(" → ")} (round-robin; rotate on 429/quota)`,
      `  catalogs=${catalogs.map((c) => c.id).join(",")}`,
      `  catalogConcurrency=${CATALOG_CONCURRENCY} localeConcurrency=${LOCALE_CONCURRENCY} concurrency=${CONCURRENCY} batchSize=${BATCH_SIZE}`,
      `  quality=namespace-batch + ICU/glossary gate + shrink-retry`,
      `  force=${args.force} dryRun=${args.dryRun}`,
      "",
    ].join("\n"),
  );

  if (!args.dryRun) {
    const smoke = await translateBatch("zh-Hans", [["__ping__", "Hello"]]);
    if (!smoke.has("__ping__")) {
      console.error("Smoke translation failed — aborting.");
      process.exit(1);
    }
    process.stdout.write(`smoke ok → ${smoke.get("__ping__")}\n`);
  }

  const catalogLimit = pLimit(CATALOG_CONCURRENCY);
  const nested = await Promise.all(
    catalogs.map((c) => catalogLimit(() => translateCatalog(c, args))),
  );
  const results = nested.flat();

  const totalT = results.reduce((s, r) => s + (r?.translated ?? 0), 0);
  const totalF = results.reduce((s, r) => s + (r?.failed ?? 0), 0);
  process.stdout.write(`\nDone. translated=${totalT} failed=${totalF}\n`);
  // Partial success is normal when Token Plan quota is exhausted mid-run.
  // Keep exit 0 so CI can still commit whatever was translated; hard-fail only
  // when nothing landed and there were failures (or total API outage).

  // Optional: keep landing i18n.lock roughly honest when landing ran
  if (!args.dryRun && catalogs.some((c) => c.id === "landing")) {
    try {
      const en = JSON.parse(readFileSync(join(REPO_ROOT, "apps/landing/messages/en.json"), "utf8"));
      const flat = flatten(en);
      const checksums = {};
      for (const [k, v] of flat) {
        if (typeof v === "string") {
          checksums[k.replaceAll(".", "/")] = createHash("md5").update(v).digest("hex");
        }
      }
      const bucketId = createHash("md5").update("messages/[locale].json").digest("hex");
      const lines = ["version: 1", "checksums:", `  ${bucketId}:`];
      for (const [k, hash] of Object.entries(checksums).sort(([a], [b]) => a.localeCompare(b))) {
        lines.push(`    ${k}: ${hash}`);
      }
      lines.push("");
      writeFileSync(join(REPO_ROOT, "apps/landing/i18n.lock"), lines.join("\n"), "utf8");
    } catch {
      // non-fatal
    }
  }

  if (totalF > 0 && totalT === 0) {
    process.exitCode = 2;
  } else if (totalF > 0) {
    process.stdout.write(
      `Note: partial run (quota/errors). Retry later without --force to fill remaining identical/missing leaves.\n`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
