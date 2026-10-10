#!/usr/bin/env node
/**
 * Bring every target catalog back to the contract in scripts/lib/i18n-catalog.mjs.
 * Offline and idempotent; the translation workflow runs it before filling.
 *
 *   node scripts/i18n-sync.mjs              rewrite catalogs + i18n.lock.json
 *   node scripts/i18n-sync.mjs --check      exit 1 if anything would change
 *   node scripts/i18n-sync.mjs --catalog landing
 *
 * Per target locale it:
 *   - drops keys en.json no longer has
 *   - drops English copies (a value equal to the source that is not a
 *     universal value or a model-confirmed identity) — the runtime renders the
 *     English anyway, and the copy hid the gap from every report
 *   - drops translations that would break at render time (invalid ICU, or a
 *     placeholder/tag set different from the source), and leftovers of older
 *     English in values with nothing to translate ("104" after en moved to "111")
 *   - writes keys in en.json order, and creates an empty file for a product
 *     language that has none
 * and in i18n.lock.json it marks translations stale whose English changed.
 *
 * It never adds English to a target file. That was the old seeder's job, and
 * it is how 45 000 untranslated strings came to look translated.
 */
import { join } from "node:path";
import { CATALOGS } from "./i18n-catalogs.mjs";
import {
  BRAND_TERMS,
  catalogDir,
  confirmedFor,
  flatten,
  icuMismatch,
  isEnglishCopy,
  isUntranslatable,
  loadConfirmed,
  loadLock,
  readJson,
  saveLock,
  shortFingerprint,
  strayLocaleFiles,
  unflatten,
  writeJson,
} from "./lib/i18n-catalog.mjs";
import { SOURCE_LOCALE, TARGET_LOCALES } from "./lib/i18n-registry.mjs";

/** Pure: normalise one target map against the source. */
export function syncLocale(sourceMap, targetMap, confirmed) {
  const kept = new Map();
  const removed = { extra: [], copy: [], broken: [] };
  for (const [key, value] of targetMap) {
    const source = sourceMap.get(key);
    if (source === undefined) {
      removed.extra.push(key);
      continue;
    }
    if (typeof source === "string" && typeof value === "string") {
      if (isEnglishCopy(source, value, confirmed.get(key))) {
        removed.copy.push(key);
        continue;
      }
      if (BRAND_TERMS.has(source.trim()) && value !== source) {
        removed.broken.push(`${key} — brand term translated as ${JSON.stringify(value)}`);
        continue;
      }
      // "$2,000" → "$2.000" is a localisation; "111" → "104" is a leftover.
      const digits = (v) => v.replace(/\D/g, "");
      if (isUntranslatable(source) && value !== source && digits(value) !== digits(source)) {
        removed.broken.push(`${key} — stale literal ${JSON.stringify(value)}`);
        continue;
      }
      const mismatch = icuMismatch(source, value);
      if (mismatch) {
        removed.broken.push(`${key} — ${mismatch}`);
        continue;
      }
    }
    kept.set(key, value);
  }
  return { kept, removed };
}

/** Pure: advance the lock for one catalog; returns keys whose English changed. */
export function advanceSources(lockSources, sourceMap) {
  const changed = [];
  const next = {};
  for (const [key, value] of sourceMap) {
    if (typeof value !== "string") continue;
    const fp = shortFingerprint(value);
    if (lockSources[key] && lockSources[key] !== fp) changed.push(key);
    next[key] = fp;
  }
  return { next, changed };
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes("--check");
  const only = argv.includes("--catalog") ? argv[argv.indexOf("--catalog") + 1] : null;
  const confirmed = loadConfirmed();
  const lock = loadLock();
  let dirty = 0;

  for (const catalog of CATALOGS) {
    if (only && catalog.id !== only) continue;
    const dir = catalogDir(catalog);
    const sourceJson = readJson(join(dir, `${SOURCE_LOCALE}.json`), null);
    if (!sourceJson) continue;
    const sourceMap = flatten(sourceJson);
    const order = [...sourceMap.keys()];

    const { next, changed } = advanceSources(lock.sources[catalog.id] ?? {}, sourceMap);
    const stray = strayLocaleFiles(catalog);
    if (stray.length) {
      process.stdout.write(
        `[${catalog.id}] not a product language, delete: ${stray.map((l) => `${l}.json`).join(", ")}\n`,
      );
      dirty++;
    }

    const totals = { extra: 0, copy: 0, broken: 0, created: 0, stale: 0 };
    for (const locale of TARGET_LOCALES) {
      const path = join(dir, `${locale}.json`);
      const current = readJson(path, undefined);
      const targetMap = flatten(current ?? {});
      const { kept, removed } = syncLocale(
        sourceMap,
        targetMap,
        confirmedFor(confirmed, catalog.id, locale),
      );
      const output = unflatten(kept, order);
      const before = current === undefined ? null : JSON.stringify(current);
      if (before !== JSON.stringify(output)) {
        dirty++;
        if (!check) writeJson(path, output);
      }
      if (current === undefined) totals.created++;
      totals.extra += removed.extra.length;
      totals.copy += removed.copy.length;
      totals.broken += removed.broken.length;

      const staleHere = changed.filter((key) => kept.has(key));
      if (staleHere.length) {
        const byLocale = ((lock.stale[catalog.id] ??= {})[locale] ??= []);
        byLocale.push(...staleHere);
        totals.stale += staleHere.length;
      }
    }
    // Stale entries for keys that no longer exist are noise.
    for (const keys of Object.values(lock.stale[catalog.id] ?? {})) {
      const live = keys.filter((k) => sourceMap.has(k));
      keys.splice(0, keys.length, ...live);
    }
    const sorted = (o) => JSON.stringify(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
    const lockChanged = sorted(lock.sources[catalog.id] ?? {}) !== sorted(next);
    if (lockChanged) dirty++;
    lock.sources[catalog.id] = next;

    process.stdout.write(
      `[${catalog.id}] removed copies=${totals.copy} broken=${totals.broken} extra=${totals.extra}` +
        ` | created=${totals.created} | newly stale=${totals.stale}\n`,
    );
  }

  if (check) {
    if (dirty) {
      process.stderr.write(
        "i18n:sync --check: catalogs are not normalised — run `pnpm i18n:sync`.\n",
      );
      process.exit(1);
    }
    process.stdout.write("i18n:sync --check: clean\n");
    return;
  }
  saveLock(lock);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
