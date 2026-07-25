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
 *   model: sensenova-6.7-flash-lite
 *   thinking: { type: "disabled" }
 *   Docs: https://github.com/OpenSenseNova/SenseNova6.7/blob/main/API_CN.md
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
const MODEL = process.env.SENSENOVA_TRANSLATE_MODEL || "sensenova-6.7-flash-lite";
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

/** Minimal p-limit (no external dep at repo root). */
function pLimit(concurrency) {
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

function shouldSkipValue(value) {
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

function flatten(obj, prefix = "", out = new Map()) {
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

function unflatten(map) {
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

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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

function collectWork(sourceMap, targetMap, { force }) {
  const work = [];
  for (const [key, enVal] of sourceMap) {
    if (typeof enVal !== "string" || shouldSkipValue(enVal)) continue;
    const cur = targetMap.get(key);
    const missing = cur === undefined;
    const identical = typeof cur === "string" && cur === enVal && enVal.length > 12;
    if (force || missing || identical) work.push([key, enVal]);
  }
  return work;
}

async function translateBatch(targetLocale, entries) {
  const targetName = LOCALE_NAMES[targetLocale] || targetLocale;
  const payload = Object.fromEntries(entries);
  const body = {
    model: MODEL,
    temperature: 0.2,
    max_tokens: Math.min(8192, 64 + entries.length * 120),
    thinking: { type: "disabled" },
    messages: [
      {
        role: "system",
        content: [
          `You are a professional product UI translator for a global SaaS (Nebutra).`,
          `Translate each JSON string value from English to ${targetName} (${targetLocale}).`,
          `Rules:`,
          `- Natural product UI tone — concise, native, not literal machine-translationese.`,
          `- Keep brand / product names untranslated: Nebutra, Forge, Router, Stripe, Clerk, Vercel, OpenAI, GitHub, MCP, API, UUID, JWT, PDF, JSON, YAML, CSV, XML, Cron, LLM, RAG.`,
          `- Preserve ICU placeholders exactly: {name}, {count}, {brandName}, {{var}}, etc.`,
          `- Preserve HTML/Markdown/code spans, file paths, and punctuation structure.`,
          `- For zh-Hant use Traditional Chinese characters (繁體), never Simplified.`,
          `- For zh-Hans use Simplified Chinese characters (简体), never Traditional.`,
          `- For RTL locales (ar/he/fa/ur) return plain translated text only (no bidi marks).`,
          `- Return ONLY a valid JSON object with the SAME keys and translated string values.`,
          `- No markdown fences, no commentary.`,
        ].join("\n"),
      },
      { role: "user", content: JSON.stringify(payload) },
    ],
  };

  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        await sleep(400 * 2 ** (attempt - 1) + Math.random() * 200);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
      const data = JSON.parse(text);
      let content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error(`empty content: ${text.slice(0, 300)}`);
      }
      content = content.trim();
      if (content.startsWith("```")) {
        content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      }
      const parsed = JSON.parse(content);
      const out = new Map();
      for (const [k] of entries) {
        const v = parsed[k];
        if (typeof v === "string" && v.trim()) out.set(k, v);
      }
      if (out.size === 0) throw new Error("parsed batch produced 0 usable strings");
      return out;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        await sleep(300 * 2 ** (attempt - 1) + Math.random() * 150);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error("translateBatch failed");
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

  process.stdout.write(
    `[${catalog.id}/${targetLocale}] ${work.length} strings → ${Math.ceil(work.length / BATCH_SIZE)} batches @ concurrency=${CONCURRENCY}\n`,
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
  const batches = chunk(work, BATCH_SIZE);
  let translated = 0;
  let failed = 0;
  const updates = new Map();

  await Promise.all(
    batches.map((batch, idx) =>
      limit(async () => {
        try {
          const result = await translateBatch(targetLocale, batch);
          for (const [k, v] of result) updates.set(k, v);
          translated += result.size;
          for (const [k, en] of batch) {
            if (!updates.has(k)) {
              failed += 1;
              if (!targetMap.has(k)) updates.set(k, en);
            }
          }
          if ((idx + 1) % 5 === 0 || idx === batches.length - 1) {
            process.stdout.write(
              `  [${catalog.id}/${targetLocale}] batch ${idx + 1}/${batches.length} (+${result.size})\n`,
            );
          }
        } catch (err) {
          failed += batch.length;
          process.stderr.write(
            `  [${catalog.id}/${targetLocale}] batch ${idx + 1} failed: ${
              err instanceof Error ? err.message : err
            }\n`,
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
      `  model=${MODEL}`,
      `  catalogs=${catalogs.map((c) => c.id).join(",")}`,
      `  catalogConcurrency=${CATALOG_CONCURRENCY} localeConcurrency=${LOCALE_CONCURRENCY} concurrency=${CONCURRENCY} batchSize=${BATCH_SIZE}`,
      `  force=${args.force} dryRun=${args.dryRun}`,
      "",
    ].join("\n"),
  );

  if (!args.dryRun) {
    const smoke = await translateBatch("zh", [["__ping__", "Hello"]]);
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

  if (totalF > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
