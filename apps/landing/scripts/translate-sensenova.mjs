#!/usr/bin/env node
/**
 * Concurrent i18n translator for apps/landing via SenseNova Token Plan.
 *
 * Official API (https://github.com/OpenSenseNova/SenseNova6.7/blob/main/API_CN.md):
 *   POST https://token.sensenova.cn/v1/chat/completions
 *   model: sensenova-6.7-flash-lite
 *   thinking: { type: "disabled" }  — required for short translation outputs
 *
 * Concurrency model:
 *   - Locales run in parallel (LOCALE_CONCURRENCY, default = all targets)
 *   - Within each locale, translation batches run with CONCURRENCY workers
 *   - Each request carries BATCH_SIZE leaf strings as a JSON object
 *
 * Usage:
 *   SENSENOVA_API_KEY=sk-... node scripts/translate-sensenova.mjs
 *   SENSENOVA_API_KEY=sk-... node scripts/translate-sensenova.mjs --force
 *   SENSENOVA_API_KEY=sk-... node scripts/translate-sensenova.mjs --locale zh --locale ja
 *   CONCURRENCY=32 BATCH_SIZE=24 node scripts/translate-sensenova.mjs
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pLimit from "p-limit";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MESSAGES_DIR = join(ROOT, "messages");
const I18N_JSON = join(ROOT, "i18n.json");

const API_BASE = (process.env.SENSENOVA_BASE_URL || "https://token.sensenova.cn/v1").replace(
  /\/$/,
  "",
);
const MODEL = process.env.SENSENOVA_TRANSLATE_MODEL || "sensenova-6.7-flash-lite";
const API_KEY = process.env.SENSENOVA_API_KEY || process.env.OPENAI_API_KEY;

// Tunables — Token Plan free tier is ~1500 req / 5h; batching keeps us under that.
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 24));
const LOCALE_CONCURRENCY = Math.max(1, Number(process.env.LOCALE_CONCURRENCY || 6));
const BATCH_SIZE = Math.max(1, Number(process.env.BATCH_SIZE || 20));
const MAX_RETRIES = Math.max(1, Number(process.env.MAX_RETRIES || 4));
const REQUEST_TIMEOUT_MS = Math.max(5_000, Number(process.env.REQUEST_TIMEOUT_MS || 60_000));

const LOCALE_NAMES = {
  zh: "Simplified Chinese",
  ja: "Japanese",
  ko: "Korean",
  es: "Spanish",
  fr: "French",
  de: "German",
};

/** Strings that must stay identical across locales (product IDs, CLI, etc.). */
function shouldSkipValue(value) {
  if (typeof value !== "string") return true;
  const v = value.trim();
  if (!v) return true;
  // Pure placeholders / tokens
  if (/^\{[a-zA-Z0-9_.]+\}$/.test(v)) return true;
  // CLI / package names
  if (/^(pnpm|npx|npm|yarn|docker|git|nebutra|create-sailor)\b/i.test(v) && v.length < 80) {
    return true;
  }
  // URLs / emails
  if (/^https?:\/\//i.test(v) || /^[\w.+-]+@[\w.-]+$/.test(v)) return true;
  // Only punctuation / numbers
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
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      flatten(v, path, out);
    } else {
      out.set(path, v);
    }
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

function md5(s) {
  return createHash("md5").update(String(s)).digest("hex");
}

function parseArgs(argv) {
  const force = argv.includes("--force");
  const dryRun = argv.includes("--dry-run");
  const locales = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--locale" && argv[i + 1]) {
      locales.push(argv[++i]);
    }
  }
  return { force, dryRun, locales };
}

function loadTargets() {
  const cfg = JSON.parse(readFileSync(I18N_JSON, "utf8"));
  return cfg.locale?.targets ?? Object.keys(LOCALE_NAMES);
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Translate a batch of key→en-string pairs. Returns key→translated-string.
 */
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
          `You are a professional product UI translator.`,
          `Translate each JSON string value from English to ${targetName} (${targetLocale}).`,
          `Rules:`,
          `- Keep brand names untranslated: Nebutra, Stripe, Clerk, Vercel, OpenAI, GitHub, etc.`,
          `- Preserve ICU placeholders exactly: {name}, {count}, {{var}}, etc.`,
          `- Preserve HTML/Markdown/code spans and punctuation structure.`,
          `- Return ONLY a valid JSON object with the SAME keys and translated string values.`,
          `- No markdown fences, no commentary.`,
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify(payload),
      },
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
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 400)}`);
      }
      const data = JSON.parse(text);
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error(`empty content: ${text.slice(0, 300)}`);
      }
      let cleaned = content.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      }
      const parsed = JSON.parse(cleaned);
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

function collectWork(sourceMap, targetMap, { force }) {
  const work = [];
  for (const [key, enVal] of sourceMap) {
    if (typeof enVal !== "string" || shouldSkipValue(enVal)) continue;
    const cur = targetMap.get(key);
    const missing = cur === undefined;
    const identical = typeof cur === "string" && cur === enVal && enVal.length > 12;
    if (force || missing || identical) {
      work.push([key, enVal]);
    }
  }
  return work;
}

async function translateLocale(targetLocale, sourceMap, { force, dryRun }) {
  const path = join(MESSAGES_DIR, `${targetLocale}.json`);
  const existing = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  const targetMap = flatten(existing);
  const work = collectWork(sourceMap, targetMap, { force });

  if (work.length === 0) {
    process.stdout.write(`[${targetLocale}] up-to-date (0 jobs)\n`);
    return { locale: targetLocale, translated: 0, failed: 0 };
  }

  process.stdout.write(
    `[${targetLocale}] ${work.length} strings → ${Math.ceil(work.length / BATCH_SIZE)} batches @ concurrency=${CONCURRENCY}\n`,
  );

  if (dryRun) {
    return { locale: targetLocale, translated: work.length, failed: 0, dryRun: true };
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
          // Fill missing keys that model dropped with previous/en to avoid data loss
          for (const [k, en] of batch) {
            if (!updates.has(k)) {
              failed += 1;
              // keep existing or fall back to en (verify will flag later)
              if (!targetMap.has(k)) updates.set(k, en);
            }
          }
          if ((idx + 1) % 5 === 0 || idx === batches.length - 1) {
            process.stdout.write(
              `  [${targetLocale}] batch ${idx + 1}/${batches.length} (+${result.size})\n`,
            );
          }
        } catch (err) {
          failed += batch.length;
          process.stderr.write(
            `  [${targetLocale}] batch ${idx + 1} failed: ${err instanceof Error ? err.message : err}\n`,
          );
        }
      }),
    ),
  );

  // Merge: start from source structure so key order/shape stays aligned with en
  const merged = new Map(sourceMap);
  // Prefer previous translations
  for (const [k, v] of targetMap) {
    if (merged.has(k) && typeof v === "string") merged.set(k, v);
  }
  // Apply new translations
  for (const [k, v] of updates) {
    if (merged.has(k)) merged.set(k, v);
  }

  // Non-string leaves from source (shouldn't happen often)
  const outObj = unflatten(merged);
  writeFileSync(path, `${JSON.stringify(outObj, null, 2)}\n`, "utf8");

  process.stdout.write(
    `[${targetLocale}] wrote ${path} (translated=${translated}, failed=${failed})\n`,
  );
  return { locale: targetLocale, translated, failed };
}

function updateLockfile(sourceMap) {
  // Lightweight lock: md5 of each leaf — keeps lingo.lock roughly honest for tooling
  const lockPath = join(ROOT, "i18n.lock");
  const checksums = {};
  for (const [k, v] of sourceMap) {
    if (typeof v === "string") checksums[k.replaceAll(".", "/")] = md5(v);
  }
  // Preserve lingo lock envelope if present
  let version = 1;
  if (existsSync(lockPath)) {
    const raw = readFileSync(lockPath, "utf8");
    const m = raw.match(/^version:\s*(\d+)/m);
    if (m) version = Number(m[1]) || 1;
  }
  // Single bucket hash id stable for messages
  const bucketId = md5("messages/[locale].json");
  const lines = [`version: ${version}`, "checksums:", `  ${bucketId}:`];
  for (const [k, hash] of Object.entries(checksums).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`    ${k}: ${hash}`);
  }
  lines.push("");
  writeFileSync(lockPath, lines.join("\n"), "utf8");
  process.stdout.write(`[lock] updated ${lockPath} (${Object.keys(checksums).length} keys)\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!API_KEY) {
    console.error("Missing SENSENOVA_API_KEY (or OPENAI_API_KEY).");
    process.exit(1);
  }

  const sourcePath = join(MESSAGES_DIR, "en.json");
  const source = JSON.parse(readFileSync(sourcePath, "utf8"));
  const sourceMap = flatten(source);

  let targets = loadTargets();
  if (args.locales.length) {
    targets = targets.filter((t) => args.locales.includes(t));
  }
  if (!targets.length) {
    console.error("No target locales selected.");
    process.exit(1);
  }

  process.stdout.write(
    [
      `SenseNova Token Plan translator`,
      `  base=${API_BASE}`,
      `  model=${MODEL}`,
      `  targets=${targets.join(",")}`,
      `  concurrency=${CONCURRENCY} localeConcurrency=${LOCALE_CONCURRENCY} batchSize=${BATCH_SIZE}`,
      `  force=${args.force} dryRun=${args.dryRun}`,
      `  sourceLeaves=${sourceMap.size}`,
      "",
    ].join("\n"),
  );

  // Smoke: one tiny call to fail fast
  if (!args.dryRun) {
    const smoke = await translateBatch(targets[0], [["__ping__", "Hello"]]);
    if (!smoke.has("__ping__")) {
      console.error("Smoke translation failed — aborting.");
      process.exit(1);
    }
    process.stdout.write(`smoke ok → ${smoke.get("__ping__")}\n\n`);
  }

  const localeLimit = pLimit(LOCALE_CONCURRENCY);
  const results = await Promise.all(
    targets.map((locale) => localeLimit(() => translateLocale(locale, sourceMap, args))),
  );

  if (!args.dryRun) {
    updateLockfile(sourceMap);
  }

  const totalT = results.reduce((s, r) => s + r.translated, 0);
  const totalF = results.reduce((s, r) => s + r.failed, 0);
  process.stdout.write(`\nDone. translated=${totalT} failed=${totalF}\n`);
  if (totalF > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
