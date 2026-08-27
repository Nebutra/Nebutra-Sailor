#!/usr/bin/env node
/**
 * Lightweight orphan / drift report for product message catalogs.
 *
 * No model, no network, no writes — safe for weekly schedule and local dry runs.
 * Does NOT block main CI. Use --fail-on-missing only when you want a hard gate.
 *
 * Reports per catalog × locale:
 *   - missing: keys in en.json absent from locale (or null)
 *   - identical: non-empty leaves still equal to English (may be intentional)
 *   - identicalDebt: identical minus EXACT_LEAF_KEEP product labels
 *
 * Usage:
 *   node scripts/i18n-orphan-report.mjs
 *   node scripts/i18n-orphan-report.mjs --json
 *   node scripts/i18n-orphan-report.mjs --fail-on-missing
 *   node scripts/i18n-orphan-report.mjs --catalog landing
 */

import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { EXACT_LEAF_KEEP, flatten, shouldSkipValue } from "./i18n-translate-helpers.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CATALOGS = [
  { id: "landing", messagesDir: "apps/landing/messages" },
  { id: "web", messagesDir: "packages/platform/i18n/locales" },
  { id: "forge", messagesDir: "apps/forge/messages" },
  { id: "router", messagesDir: "apps/router/messages" },
];

function parseArgs(argv) {
  const catalogs = [];
  let asJson = false;
  let failOnMissing = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") asJson = true;
    else if (a === "--fail-on-missing") failOnMissing = true;
    else if (a === "--catalog") {
      const id = argv[++i];
      if (id) catalogs.push(id);
    }
  }
  return { asJson, failOnMissing, catalogs };
}

function listLocaleFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "en.json")
    .sort();
}

function scanCatalog(catalog) {
  const dir = join(REPO, catalog.messagesDir);
  const enPath = join(dir, "en.json");
  if (!existsSync(enPath)) {
    return { id: catalog.id, path: catalog.messagesDir, error: "no en.json", locales: [] };
  }
  const en = JSON.parse(readFileSync(enPath, "utf8"));
  const sourceMap = flatten(en);
  const locales = [];

  for (const file of listLocaleFiles(dir)) {
    const locale = file.replace(/\.json$/, "");
    const targetMap = flatten(JSON.parse(readFileSync(join(dir, file), "utf8")));
    let missing = 0;
    let identical = 0;
    let identicalExactKeep = 0;
    let translatable = 0;

    for (const [key, enVal] of sourceMap) {
      if (typeof enVal !== "string" || shouldSkipValue(enVal)) continue;
      translatable++;
      const cur = targetMap.get(key);
      if (cur === undefined || cur === null) {
        missing++;
        continue;
      }
      if (typeof cur === "string" && cur === enVal && enVal.trim()) {
        identical++;
        if (EXACT_LEAF_KEEP.includes(enVal)) identicalExactKeep++;
      }
    }

    locales.push({
      locale,
      translatable,
      missing,
      identical,
      identicalExactKeep,
      identicalDebt: Math.max(0, identical - identicalExactKeep),
    });
  }

  return { id: catalog.id, path: catalog.messagesDir, locales };
}

function main() {
  const { asJson, failOnMissing, catalogs: filter } = parseArgs(process.argv.slice(2));
  let catalogs = CATALOGS;
  if (filter.length) {
    catalogs = CATALOGS.filter((c) => filter.includes(c.id));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    catalogs: catalogs.map(scanCatalog),
  };

  let totalMissing = 0;
  let totalIdenticalDebt = 0;
  for (const cat of report.catalogs) {
    for (const loc of cat.locales || []) {
      totalMissing += loc.missing;
      totalIdenticalDebt += loc.identicalDebt;
    }
  }
  report.totals = { missing: totalMissing, identicalDebt: totalIdenticalDebt };

  if (asJson) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(`i18n orphan report @ ${report.generatedAt}`);
    console.log(`totals: missing=${totalMissing} identicalDebt≈${totalIdenticalDebt}`);
    console.log("(identicalDebt excludes EXACT_LEAF_KEEP English product labels)\n");
    for (const cat of report.catalogs) {
      if (cat.error) {
        console.log(`## ${cat.id} (${cat.path}) — ${cat.error}`);
        continue;
      }
      console.log(`## ${cat.id} (${cat.path})`);
      const hot = [...cat.locales]
        .filter((l) => l.missing > 0 || l.identicalDebt > 0)
        .sort((a, b) => b.missing + b.identicalDebt - (a.missing + a.identicalDebt))
        .slice(0, 12);
      if (!hot.length) {
        console.log("  all locales look filled (or only exact-keep English remains)\n");
        continue;
      }
      for (const l of hot) {
        console.log(
          `  ${l.locale.padEnd(8)} missing=${String(l.missing).padStart(4)}  identicalDebt≈${String(l.identicalDebt).padStart(4)}  (identical=${l.identical}, exactKeep=${l.identicalExactKeep})`,
        );
      }
      if (cat.locales.length > hot.length) {
        console.log(`  … ${cat.locales.length - hot.length} quieter locale(s) omitted`);
      }
      console.log("");
    }
    console.log(
      "No API calls. To fill gaps: workflow_dispatch i18n-translate (or pnpm i18n:translate).",
    );
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      "### i18n orphan report",
      "",
      `- missing keys: **${totalMissing}**`,
      `- identical-to-en debt (excl. exact-keep): **~${totalIdenticalDebt}**`,
      "",
      "| catalog | worst locale | missing | identicalDebt |",
      "|---|---|---:|---:|",
    ];
    for (const cat of report.catalogs) {
      if (!cat.locales?.length) continue;
      const worst = [...cat.locales].sort(
        (a, b) => b.missing + b.identicalDebt - (a.missing + a.identicalDebt),
      )[0];
      lines.push(`| ${cat.id} | ${worst.locale} | ${worst.missing} | ${worst.identicalDebt} |`);
    }
    lines.push("");
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
  }

  if (failOnMissing && totalMissing > 0) {
    console.error(`\n[orphan] fail-on-missing: ${totalMissing} missing leaf(ves)`);
    process.exit(1);
  }
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entry) main();
