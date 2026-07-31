import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BootLogCatalog } from "@nebutra/i18n/boot-log";
import { describe, expect, it } from "vitest";
import {
  BOOT_LOG_ENTRIES,
  BOOT_LOG_YEARS,
  bootLogBucket,
  bootLogDensity,
  bootLogSpan,
  bootLogYear,
  pickBootLogRotation,
} from "./boot-log";

/**
 * The archive is split in two — structure here, prose in the `boot-log` message
 * catalog — so it is checked in two places. The check that matters most is the
 * sources one: an entry written from memory has no citation, so an empty
 * `sources` array is the shape a fabricated entry takes.
 */
const CATALOG_DIR = join(import.meta.dirname, "../../../../packages/platform/i18n/boot-log");

const catalog = (locale: string): BootLogCatalog =>
  JSON.parse(readFileSync(join(CATALOG_DIR, `${locale}.json`), "utf8"));

const en = catalog("en");
const zh = catalog("zh");

describe("boot log structure", () => {
  it("gives every entry at least one resolvable citation", () => {
    for (const entry of BOOT_LOG_ENTRIES) {
      expect(entry.sources.length, `${entry.id} has no source`).toBeGreaterThan(0);
      for (const source of entry.sources) {
        expect(source.url, `${entry.id}: ${source.label}`).toMatch(/^https?:\/\/\S+$/);
        expect(source.label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("has unique ids and a date stamp on every entry", () => {
    const ids = BOOT_LOG_ENTRIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of BOOT_LOG_ENTRIES) {
      expect(entry.stamp.trim().length, entry.id).toBeGreaterThan(0);
    }
  });

  it("keeps citations out of the translated catalog", () => {
    // A translator handed a URL will localise it, and a wrong citation is the
    // one defect this archive cannot ship. Evidence stays in code.
    expect(JSON.stringify(en)).not.toMatch(/https?:\/\//);
  });
});

describe("boot log copy", () => {
  it("carries every structural entry in both authored languages", () => {
    for (const entry of BOOT_LOG_ENTRIES) {
      expect(en.entries[entry.id], `${entry.id} missing from en`).toBeDefined();
      expect(zh.entries[entry.id], `${entry.id} missing from zh`).toBeDefined();
    }
    expect(Object.keys(en.entries)).toHaveLength(BOOT_LOG_ENTRIES.length);
  });

  it("stays inside the length the card reserves", () => {
    for (const [lang, source] of [
      ["zh", zh],
      ["en", en],
    ] as const) {
      for (const [id, copy] of Object.entries(source.entries)) {
        expect(copy.title.trim().length, `${id}.${lang}.title`).toBeGreaterThan(0);
        expect(copy.tag.trim().length, `${id}.${lang}.tag`).toBeGreaterThan(0);
        expect(copy.coda.trim().length, `${id}.${lang}.coda`).toBeGreaterThan(0);
        const limit = lang === "zh" ? 130 : 320;
        const floor = lang === "zh" ? 24 : 80;
        expect(copy.body.length, `${id}.${lang}.body too long`).toBeLessThanOrEqual(limit);
        expect(copy.body.length, `${id}.${lang}.body too short`).toBeGreaterThan(floor);
      }
    }
  });

  it("keeps the copy inside the microcopy punctuation rules", () => {
    // 禁标点: no emoji, no shouted endings. Full-width ! included.
    const emoji = /\p{Extended_Pictographic}/u;
    for (const [lang, source] of [
      ["zh", zh],
      ["en", en],
    ] as const) {
      for (const [id, copy] of Object.entries(source.entries)) {
        const text = [copy.title, copy.body, copy.coda].join(" ");
        expect(emoji.test(text), `${id}.${lang} contains an emoji`).toBe(false);
        expect(text.includes("!"), `${id}.${lang} shouts`).toBe(false);
        expect(text.includes("！"), `${id}.${lang} shouts`).toBe(false);
      }
    }
  });

  it("names the panel in both authored languages", () => {
    expect(en.panelLabel.length).toBeGreaterThan(0);
    expect(zh.panelLabel.length).toBeGreaterThan(0);
    expect(zh.panelLabel).not.toBe(en.panelLabel);
  });
});

describe("the rail", () => {
  it("reads the leading year out of every stamp format in use", () => {
    expect(bootLogYear("1969.10.29")).toBe(1969);
    expect(bootLogYear("1969.08")).toBe(1969);
    expect(bootLogYear("1965")).toBe(1965);
    // Two-date entries plot the earlier one.
    expect(bootLogYear("2004 · 2013")).toBe(2004);
    expect(bootLogYear("no date here")).toBeNaN();
  });

  it("plots one year per entry, in order", () => {
    expect(BOOT_LOG_YEARS).toHaveLength(BOOT_LOG_ENTRIES.length);
    expect([...BOOT_LOG_YEARS]).toEqual([...BOOT_LOG_YEARS].sort((a, b) => a - b));
  });

  it("opens on a round decade and closes on the year being read", () => {
    const span = bootLogSpan(2031);
    expect(span.from % 10).toBe(0);
    // The rail ends at today, not at the newest entry — the last slot on it is
    // nobody's yet. A span that stopped at the archive would draw a closed period.
    expect(span.to).toBe(2031);
    expect(bootLogSpan(2026).to).toBe(2026);
  });

  it("still shows the newest entry if the clock is somehow behind the archive", () => {
    expect(bootLogSpan(1990).to).toBe(BOOT_LOG_YEARS[BOOT_LOG_YEARS.length - 1]);
  });

  it("starts where the record is continuous, not at its oldest curiosity", () => {
    const span = bootLogSpan(2026);
    const stragglers = BOOT_LOG_YEARS.filter((year) => year < span.from);
    expect(span.earlier).toBe(stragglers.length);
    if (span.earlier > 0) {
      expect(span.from).toBeGreaterThan(BOOT_LOG_YEARS[0] as number);
    }
    expect(span.earlier / BOOT_LOG_YEARS.length).toBeLessThan(0.15);
  });

  it("leaves the final bar of the rail empty", () => {
    const density = bootLogDensity(46, bootLogSpan(2026));
    expect(density[density.length - 1]).toBe(0);
  });

  it("puts every entry in a bar of the rail, ends included", () => {
    const bars = 46;
    const span = bootLogSpan(2026);
    for (const entry of BOOT_LOG_ENTRIES) {
      const bucket = bootLogBucket(bootLogYear(entry.stamp), bars, span);
      expect(bucket, entry.id).toBeGreaterThanOrEqual(0);
      expect(bucket, entry.id).toBeLessThan(bars);
    }
    // An unreadable stamp parks at an end rather than throwing.
    expect(bootLogBucket(Number.NaN, bars, span)).toBe(0);
  });

  it("draws the archive's density, not a ruler", () => {
    const bars = 46;
    const density = bootLogDensity(bars, bootLogSpan(2026));
    expect(density).toHaveLength(bars);
    expect(density.reduce((sum, n) => sum + n, 0)).toBe(BOOT_LOG_ENTRIES.length);
    // A ruler would be flat; the archive is not evenly spread across the span.
    expect(new Set(density).size).toBeGreaterThan(1);
  });
});

describe("pickBootLogRotation", () => {
  /** Deterministic stand-in for Math.random. */
  const sequence = (values: readonly number[]) => {
    let i = 0;
    return () => values[i++ % values.length] as number;
  };

  it("returns the requested count without repeating an entry", () => {
    const picked = pickBootLogRotation(en, 4, sequence([0.1, 0.9, 0.42, 0.7, 0.33]));
    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((entry) => entry.id)).size).toBe(4);
  });

  it("joins structure to the copy of the catalog it was given", () => {
    const [zhPick] = pickBootLogRotation(zh, 1, () => 0);
    const [enPick] = pickBootLogRotation(en, 1, () => 0);
    expect(zhPick?.id).toBe(enPick?.id);
    expect(zhPick?.stamp).toBe(enPick?.stamp);
    expect(zhPick?.body).not.toBe(enPick?.body);
    expect(Object.keys(zhPick ?? {}).sort()).toEqual([
      "body",
      "coda",
      "id",
      "stamp",
      "tag",
      "title",
      "year",
    ]);
  });

  it("skips entries the catalog has not caught up with rather than rendering blanks", () => {
    // A locale file can lag the archive between a merge and a translation pass.
    const partial: BootLogCatalog = {
      panelLabel: en.panelLabel,
      entries: Object.fromEntries(Object.entries(en.entries).slice(0, 3)),
    };
    const picked = pickBootLogRotation(partial, 10);
    expect(picked).toHaveLength(3);
    for (const record of picked) expect(record.body.length).toBeGreaterThan(0);
  });

  it("clamps a count outside the archive instead of returning holes", () => {
    expect(pickBootLogRotation(en, 0)).toHaveLength(1);
    expect(pickBootLogRotation(en, BOOT_LOG_ENTRIES.length + 10)).toHaveLength(
      BOOT_LOG_ENTRIES.length,
    );
  });

  it("never mutates the archive it draws from", () => {
    const before = BOOT_LOG_ENTRIES.map((entry) => entry.id);
    pickBootLogRotation(en, 6);
    pickBootLogRotation(zh, 6);
    expect(BOOT_LOG_ENTRIES.map((entry) => entry.id)).toEqual(before);
  });
});
