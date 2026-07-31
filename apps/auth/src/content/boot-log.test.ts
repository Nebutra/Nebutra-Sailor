import { describe, expect, it } from "vitest";
import {
  BOOT_LOG_ENTRIES,
  BOOT_LOG_LABEL,
  BOOT_LOG_YEARS,
  bootLogBucket,
  bootLogDensity,
  bootLogSpan,
  bootLogYear,
  pickBootLogRotation,
  resolveBootLogLocale,
} from "./boot-log";

/**
 * These guard the editorial contract at the top of boot-log.ts. The one that
 * matters most is the sources check: an entry written from memory has no
 * citation, so an empty `sources` array is the shape a fabricated entry takes.
 */
describe("boot log archive", () => {
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

  it("authors both languages, within the length the card reserves", () => {
    for (const entry of BOOT_LOG_ENTRIES) {
      for (const lang of ["zh", "en"] as const) {
        const copy = entry[lang];
        expect(copy.title.trim().length, `${entry.id}.${lang}.title`).toBeGreaterThan(0);
        expect(copy.tag.trim().length, `${entry.id}.${lang}.tag`).toBeGreaterThan(0);
        expect(copy.coda.trim().length, `${entry.id}.${lang}.coda`).toBeGreaterThan(0);
        const limit = lang === "zh" ? 130 : 320;
        expect(copy.body.length, `${entry.id}.${lang}.body too long`).toBeLessThanOrEqual(limit);
        const floor = lang === "zh" ? 24 : 80;
        expect(copy.body.length, `${entry.id}.${lang}.body too short`).toBeGreaterThan(floor);
      }
    }
  });

  it("keeps the copy inside the microcopy punctuation rules", () => {
    // 禁标点: no emoji, no shouted endings. Full-width ! included.
    const emoji = /\p{Extended_Pictographic}/u;
    for (const entry of BOOT_LOG_ENTRIES) {
      for (const lang of ["zh", "en"] as const) {
        const text = [entry[lang].title, entry[lang].body, entry[lang].coda].join(" ");
        expect(emoji.test(text), `${entry.id}.${lang} contains an emoji`).toBe(false);
        expect(text.includes("!"), `${entry.id}.${lang} shouts`).toBe(false);
        expect(text.includes("！"), `${entry.id}.${lang} shouts`).toBe(false);
      }
    }
  });

  it("labels the panel in both authored languages", () => {
    expect(BOOT_LOG_LABEL.zh.length).toBeGreaterThan(0);
    expect(BOOT_LOG_LABEL.en.length).toBeGreaterThan(0);
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

  it("plots one tick per entry, so the rail is the archive's own density", () => {
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
    const span = bootLogSpan(1990);
    expect(span.to).toBe(BOOT_LOG_YEARS[BOOT_LOG_YEARS.length - 1]);
  });

  it("starts where the record is continuous, not at its oldest curiosity", () => {
    const span = bootLogSpan(2026);
    // A few entries reach back centuries. Anchoring the axis on them squeezes
    // the computing era into the right third, so they stack in the first bar and
    // the label reads "and earlier" rather than naming a false starting year.
    const stragglers = BOOT_LOG_YEARS.filter((year) => year < span.from);
    expect(span.earlier).toBe(stragglers.length);
    if (span.earlier > 0) {
      expect(span.from).toBeGreaterThan(BOOT_LOG_YEARS[0] as number);
    }
    // The span must still cover the bulk of the archive.
    expect(span.earlier / BOOT_LOG_YEARS.length).toBeLessThan(0.15);
  });

  it("leaves the final bar of the rail empty", () => {
    const span = bootLogSpan(2026);
    const density = bootLogDensity(46, span);
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
    // Every entry is counted exactly once.
    expect(density.reduce((sum, n) => sum + n, 0)).toBe(BOOT_LOG_ENTRIES.length);
    // A ruler would be flat; the archive is not evenly spread across the span.
    expect(new Set(density).size).toBeGreaterThan(1);
  });
});

describe("resolveBootLogLocale", () => {
  it("routes every Chinese variant to the authored zh copy", () => {
    for (const locale of ["zh", "zh-Hans", "zh-Hant", "ZH-hant-TW"]) {
      expect(resolveBootLogLocale(locale)).toBe("zh");
    }
  });

  it("falls back to English for the locales the archive is not authored in", () => {
    for (const locale of ["en", "en-GB", "ja", "de", "ar"]) {
      expect(resolveBootLogLocale(locale)).toBe("en");
    }
  });
});

describe("pickBootLogRotation", () => {
  /** Deterministic stand-in for Math.random. */
  const sequence = (values: readonly number[]) => {
    let i = 0;
    return () => values[i++ % values.length] as number;
  };

  it("returns the requested count without repeating an entry", () => {
    const picked = pickBootLogRotation("en", 4, sequence([0.1, 0.9, 0.42, 0.7, 0.33]));
    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((entry) => entry.id)).size).toBe(4);
  });

  it("resolves the copy for the locale rather than shipping both languages", () => {
    const [zh] = pickBootLogRotation("zh-Hans", 1, () => 0);
    const [en] = pickBootLogRotation("en", 1, () => 0);
    expect(zh?.id).toBe(en?.id);
    expect(zh?.body).not.toBe(en?.body);
    expect(Object.keys(zh ?? {}).sort()).toEqual([
      "body",
      "coda",
      "id",
      "stamp",
      "tag",
      "title",
      "year",
    ]);
  });

  it("clamps a count outside the archive instead of returning holes", () => {
    expect(pickBootLogRotation("en", 0)).toHaveLength(1);
    expect(pickBootLogRotation("en", BOOT_LOG_ENTRIES.length + 10)).toHaveLength(
      BOOT_LOG_ENTRIES.length,
    );
  });

  it("never mutates the archive it draws from", () => {
    const before = BOOT_LOG_ENTRIES.map((entry) => entry.id);
    pickBootLogRotation("en", 6);
    pickBootLogRotation("zh", 6);
    expect(BOOT_LOG_ENTRIES.map((entry) => entry.id)).toEqual(before);
  });
});
