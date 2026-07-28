#!/usr/bin/env node
/**
 * Deterministic post-process after auto-translate (no model, no network).
 *
 * Runs in the async i18n workflow so main CI stays light. Fixes known
 * over-translation failure modes:
 *   1. Exact product leaves forced back to English (Webhooks, Discord, Tokens…)
 *   2. Legal entity "{brandName} Co., Ltd." never rewritten into local company forms
 *   3. Known bad full-leaf mistranslations restored to source English
 *
 * Usage (repo root):
 *   node scripts/i18n-glossary-postprocess.mjs
 *   node scripts/i18n-glossary-postprocess.mjs --dry-run
 *   node scripts/i18n-glossary-postprocess.mjs --catalog landing
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { EXACT_LEAF_KEEP, flatten, unflatten } from "./i18n-translate-helpers.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CATALOGS = [
  { id: "landing", messagesDir: "apps/landing/messages" },
  { id: "web", messagesDir: "packages/platform/i18n/locales" },
  { id: "forge", messagesDir: "apps/forge/messages" },
  { id: "router", messagesDir: "apps/router/messages" },
];

/**
 * Full-leaf bad outputs we have already seen in production runs.
 * Prefer this over EXACT_LEAF_KEEP for words that sometimes legitimately localize
 * (e.g. design "Tokens") but have known catastrophic mistranslations.
 */
const KNOWN_BAD_EXACT = Object.freeze({
  Webhooks: new Set(["الخطافات", "ويب هوكس", "خطافات"]),
  Tokens: new Set(["Διακριτικά", "Ishara"]),
  Discord: new Set(["دیسکورد"]),
  "X (Twitter)": new Set(["ایکس (توییتر)"]),
});

/**
 * Restore legal entity when the model rewrote Co., Ltd. into a local form.
 * Only rewrites the company clause — never invents new legal entities.
 */
export function restoreLegalEntity(source, target) {
  if (typeof source !== "string" || typeof target !== "string") return target;
  if (!source.includes("Co., Ltd.")) return target;
  if (target.includes("Co., Ltd.")) return target;

  let out = target;
  // {brandName} + local legal suffix
  out = out.replace(
    /\{brandName\}\s*(?:S\.r\.l\.|B\.V\.|GmbH|Inc\.|Ltd\.|Limited|PLC|LLC|AG|SARL|S\.A\.|公司|有限公司|股份有限公司|کمپنی[،,]?\s*لمیٹڈ|株式会社)/gi,
    "{brandName} Co., Ltd.",
  );
  // If still missing and the leaf is basically the company line, force source.
  if (!out.includes("Co., Ltd.")) {
    const srcTrim = source.trim();
    if (
      srcTrim === "{brandName} Co., Ltd." ||
      srcTrim === "{brandName} Co., Ltd.。" ||
      /^\{brandName\} Co\., Ltd\.?$/.test(srcTrim)
    ) {
      return source;
    }
  }
  return out;
}

/**
 * Apply deterministic fixes to one translated leaf.
 * @returns {{ value: string, reasons: string[] }}
 */
export function postprocessLeaf(source, target) {
  if (typeof source !== "string" || typeof target !== "string") {
    return { value: target, reasons: [] };
  }
  if (target === source) return { value: target, reasons: [] };

  const reasons = [];
  let value = target;

  if (EXACT_LEAF_KEEP.includes(source) && value !== source) {
    return { value: source, reasons: [`exact-keep:${source}`] };
  }

  const badSet = KNOWN_BAD_EXACT[source];
  if (badSet?.has(value)) {
    return { value: source, reasons: [`known-bad:${source}`] };
  }

  const legal = restoreLegalEntity(source, value);
  if (legal !== value) {
    reasons.push("legal-entity");
    value = legal;
  }

  return { value, reasons };
}

function parseArgs(argv) {
  const catalogs = [];
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--catalog") {
      const id = argv[++i];
      if (id) catalogs.push(id);
    }
  }
  return { dryRun, catalogs };
}

function listLocaleFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "en.json")
    .sort();
}

function processCatalog(catalog, { dryRun }) {
  const dir = join(REPO, catalog.messagesDir);
  const enPath = join(dir, "en.json");
  if (!existsSync(enPath)) {
    console.warn(`[postprocess] skip ${catalog.id}: no en.json`);
    return { files: 0, leaves: 0 };
  }
  const en = JSON.parse(readFileSync(enPath, "utf8"));
  const sourceMap = flatten(en);
  let files = 0;
  let leaves = 0;

  for (const file of listLocaleFiles(dir)) {
    const path = join(dir, file);
    const localeObj = JSON.parse(readFileSync(path, "utf8"));
    const targetMap = flatten(localeObj);
    let changed = false;
    const fileReasons = [];

    for (const [key, enVal] of sourceMap) {
      if (typeof enVal !== "string") continue;
      const cur = targetMap.get(key);
      if (typeof cur !== "string") continue;
      const { value, reasons } = postprocessLeaf(enVal, cur);
      if (value !== cur) {
        targetMap.set(key, value);
        changed = true;
        leaves++;
        if (reasons.length) fileReasons.push(`${key}: ${reasons.join(",")}`);
      }
    }

    if (!changed) continue;
    files++;
    if (dryRun) {
      console.log(`[postprocess] dry-run ${catalog.id}/${file}: ${fileReasons.length} fix(es)`);
      for (const line of fileReasons.slice(0, 12)) console.log(`  - ${line}`);
      if (fileReasons.length > 12) console.log(`  … +${fileReasons.length - 12} more`);
    } else {
      const next = unflatten(targetMap);
      writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
      console.log(`[postprocess] fixed ${catalog.id}/${file}: ${fileReasons.length} leaf(ves)`);
    }
  }

  return { files, leaves };
}

function main() {
  const { dryRun, catalogs: filter } = parseArgs(process.argv.slice(2));
  let catalogs = CATALOGS;
  if (filter.length) {
    catalogs = CATALOGS.filter((c) => filter.includes(c.id));
    if (!catalogs.length) {
      console.error(`Unknown --catalog. Known: ${CATALOGS.map((c) => c.id).join(", ")}`);
      process.exit(2);
    }
  }

  let totalFiles = 0;
  let totalLeaves = 0;
  for (const cat of catalogs) {
    const r = processCatalog(cat, { dryRun });
    totalFiles += r.files;
    totalLeaves += r.leaves;
  }

  console.log(
    `[postprocess] ${dryRun ? "dry-run " : ""}done: ${totalLeaves} leaf fix(es) across ${totalFiles} file(s)`,
  );
}

// Allow unit import without running main
const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entry) main();
