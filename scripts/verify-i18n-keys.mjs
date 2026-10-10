#!/usr/bin/env node
/**
 * i18n gate — every catalog in scripts/i18n-catalogs.mjs, against the contract
 * in scripts/lib/i18n-catalog.mjs.
 *
 * Blocking (exit 1):
 *   - en.json carries a message that is not valid ICU (next-intl renders it as
 *     its key path, in every language)
 *   - a target value that is an English copy — a key that is not translated
 *     must be ABSENT; the runtime renders the English. Copies made coverage
 *     unmeasurable: 58 000 of them passed this gate's predecessor.
 *   - a target value that would break at render time: invalid ICU, a
 *     placeholder or tag set different from the source, or a stale literal
 *   - a target key en.json does not have
 *   - a locale file that is not a product language, or a product language
 *     without a file
 *   - the pre-push hook glob missing a catalog
 * All but the first and last are fixed mechanically by `pnpm i18n:sync`.
 *
 * Reported, never blocking: per-locale coverage, and translations queued as
 * stale because their English changed. Untranslated is an honest interim
 * state — the translation workflow fills it from en.json on main.
 *
 * Flags:
 *   --strict          untranslated keys block too (release gating)
 *   --json            machine-readable report on stdout
 *   --catalog <id>    one catalog
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CATALOGS, catalogById } from "./i18n-catalogs.mjs";
import { syncLocale } from "./i18n-sync.mjs";
import {
  catalogDir,
  confirmedFor,
  flatten,
  icuShape,
  isUniversalValue,
  loadConfirmed,
  loadLock,
  REPO_ROOT,
  readJson,
  staleKeys,
  strayLocaleFiles,
} from "./lib/i18n-catalog.mjs";
import { SOURCE_LOCALE, TARGET_LOCALES } from "./lib/i18n-registry.mjs";

const ARGV = process.argv.slice(2);
const STRICT = ARGV.includes("--strict");
const JSON_OUT = ARGV.includes("--json");
const REPORT_LIMIT = 12;

const log = JSON_OUT ? () => {} : (s) => process.stdout.write(s);

function list(items) {
  const shown = items.slice(0, REPORT_LIMIT).map((k) => `      - ${k}`);
  if (items.length > REPORT_LIMIT) shown.push(`      … and ${items.length - REPORT_LIMIT} more`);
  return `${shown.join("\n")}\n`;
}

/**
 * Check one catalog. `catalog.messagesDir` may be absolute — the architecture
 * tests point it at known-bad fixtures to prove each rule still fires.
 */
export function checkCatalog(
  catalog,
  { confirmed = loadConfirmed(), lock = loadLock(), strict = STRICT } = {},
) {
  const dir = catalogDir(catalog);
  const failures = [];
  const locales = [];
  const source = readJson(join(dir, `${SOURCE_LOCALE}.json`), null);
  if (!source) return { catalog: catalog.id, skipped: true, failures, locales, translatable: 0 };
  const sourceMap = flatten(source);
  const translatableKeys = [...sourceMap]
    .filter(([, v]) => typeof v === "string" && !isUniversalValue(v))
    .map(([k]) => k);

  const invalidSource = [];
  for (const [key, value] of sourceMap) {
    if (typeof value !== "string") continue;
    const shape = icuShape(value);
    if (!shape.ok) invalidSource.push(`${key} — ${shape.error}`);
  }
  if (invalidSource.length) {
    failures.push({
      locale: SOURCE_LOCALE,
      kind: "invalid ICU in the source",
      keys: invalidSource,
    });
  }

  const stray = strayLocaleFiles(catalog);
  if (stray.length) {
    failures.push({
      locale: "*",
      kind: "not a product language (delete the file)",
      keys: stray.map((l) => `${l}.json`),
    });
  }

  for (const locale of TARGET_LOCALES) {
    const path = join(dir, `${locale}.json`);
    if (!existsSync(path)) {
      failures.push({ locale, kind: "no catalog file", keys: [`${locale}.json`] });
      continue;
    }
    const { kept, removed } = syncLocale(
      sourceMap,
      flatten(readJson(path, {})),
      confirmedFor(confirmed, catalog.id, locale),
    );
    if (removed.copy.length)
      failures.push({ locale, kind: "English copy (delete it)", keys: removed.copy });
    if (removed.broken.length)
      failures.push({ locale, kind: "breaks at render time", keys: removed.broken });
    if (removed.extra.length)
      failures.push({ locale, kind: "key not in en.json", keys: removed.extra });

    const missing = translatableKeys.filter((k) => !kept.has(k));
    const stale = [...staleKeys(lock, catalog.id, locale)].filter((k) => kept.has(k));
    locales.push({
      locale,
      translated: translatableKeys.length - missing.length,
      missing: missing.length,
      stale: stale.length,
    });
    if (strict && missing.length) {
      failures.push({ locale, kind: "untranslated (--strict)", keys: missing });
    }
  }
  return { catalog: catalog.id, failures, locales, translatable: translatableKeys.length };
}

/**
 * The pre-push hook selects this gate with a glob, and lefthook.yml is YAML —
 * it cannot import the catalog registry. So the gate polices its own trigger:
 * add a catalog without widening the hook and this fails.
 */
function uncoveredByHook() {
  const hookPath = join(REPO_ROOT, "lefthook.yml");
  if (!existsSync(hookPath)) return [];
  const hook = readFileSync(hookPath, "utf8");
  const block = hook.slice(hook.indexOf("i18n-check:"));
  const globLine = block.split("\n").find((l) => l.trim().startsWith("glob:")) ?? "";
  return CATALOGS.filter((c) => !globLine.includes(c.messagesDir)).map((c) => c.messagesDir);
}

function main() {
  const uncovered = uncoveredByHook();
  if (uncovered.length) {
    process.stderr.write(
      `[i18n-check] lefthook.yml i18n-check glob does not cover: ${uncovered.join(", ")}\n`,
    );
    return 1;
  }
  const idx = ARGV.indexOf("--catalog");
  const selected = idx !== -1 && ARGV[idx + 1] ? [catalogById(ARGV[idx + 1])] : CATALOGS;
  const confirmed = loadConfirmed();
  const lock = loadLock();
  const reports = selected.map((c) => checkCatalog(c, { confirmed, lock }));

  if (JSON_OUT) {
    process.stdout.write(`${JSON.stringify({ strict: STRICT, catalogs: reports }, null, 2)}\n`);
  }

  let failed = false;
  for (const report of reports) {
    if (report.skipped) continue;
    const pct = (r) =>
      report.translatable ? Math.round((100 * r.translated) / report.translatable) : 100;
    const lowest = [...report.locales].sort((a, b) => pct(a) - pct(b)).slice(0, 3);
    const stale = report.locales.reduce((n, r) => n + r.stale, 0);
    const avg = report.locales.length
      ? Math.round(report.locales.reduce((n, r) => n + pct(r), 0) / report.locales.length)
      : 100;
    log(
      `[i18n-check] ${report.catalog}: ${report.translatable} strings, ${avg}% translated on average` +
        ` (lowest ${lowest.map((r) => `${r.locale} ${pct(r)}%`).join(", ")})` +
        `${stale ? `, ${stale} stale` : ""} — ${report.failures.length ? "FAIL" : "ok"}\n`,
    );
    for (const f of report.failures) {
      failed = true;
      log(`    ${f.locale}: ${f.kind} (${f.keys.length})\n${list(f.keys)}`);
    }
  }
  if (failed) {
    log(
      "\n[i18n-check] Fix: `pnpm i18n:sync` removes copies, broken translations and dead keys.\n" +
        "New strings go in en.json only — the translation workflow fills every other locale.\n",
    );
    return 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    process.exit(main());
  } catch (err) {
    process.stderr.write(`[i18n-check] ERROR: ${err.message}\n`);
    process.exit(1);
  }
}
