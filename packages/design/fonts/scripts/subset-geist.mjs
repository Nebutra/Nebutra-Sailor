#!/usr/bin/env node
/**
 * subset-geist.mjs — split Geist Sans into a Latin file and everything else.
 *
 * WHY THIS EXISTS
 * `geist/font/sans` ships one variable woff2 (~69 KB) covering Latin,
 * Latin Extended, Cyrillic, Greek and symbols, and preloads it on every page.
 * An English (or German, French, Spanish …) page draws only the Latin glyphs,
 * which are ~32 KB of that file. Split along Google Fonts' `latin` range, with
 * a `unicode-range` on each @font-face, the browser downloads the Latin file
 * for those pages and fetches the second file only when a page actually has a
 * character outside it (Polish, Czech, Vietnamese, Russian, Greek …). Nothing
 * is removed: the two files together hold every glyph of the original, and
 * subsetting never alters a glyph.
 *
 * OUTPUT (committed; `src/next-geist.ts` loads them through next/font/local):
 *   generated/geist-sans/geist-sans-latin.woff2
 *   generated/geist-sans/geist-sans-rest.woff2
 *   generated/geist-sans/ranges.json   — the unicode-range of each file
 *
 * next/font needs literal options, so `src/next-geist.ts` spells both ranges
 * out; `src/next-geist.test.ts` fails if they drift from ranges.json.
 *
 * Usage: node scripts/subset-geist.mjs [--from=<Geist-Variable.woff2>]
 * Default input: the `geist` package apps/landing depends on.
 *
 * Requires: python3 with fontTools >= 4.x and brotli (for `--flavor=woff2`),
 * the same toolchain as subset-cjk.mjs. Dev-time only; nothing runs at install.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = resolve(PKG, "../../..");
const OUT = join(PKG, "generated/geist-sans");

/**
 * Google Fonts' `latin` subset, as Fontsource ships it (same as src/next.ts),
 * plus the arrows and check marks the sites set in body text ("Read more →",
 * "↗" on external links, "✓" in plan lists). Google's range leaves out U+2192,
 * so without these every English page would fetch the second file for one
 * arrow.
 */
export const LATIN_RANGE =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2190-21FF, U+2212, U+2215, U+2713-2717, U+FEFF, U+FFFD";

function defaultInput() {
  const require = createRequire(join(REPO, "apps/landing/package.json"));
  // `geist` exports no ./package.json; its sans loader sits beside the fonts.
  return join(dirname(require.resolve("geist/font/sans")), "fonts/geist-sans/Geist-Variable.woff2");
}

function parseRanges(range) {
  return range.split(",").map((part) => {
    const [a, b] = part.trim().replace(/^U\+/i, "").split("-");
    const lo = Number.parseInt(a, 16);
    return [lo, b ? Number.parseInt(b, 16) : lo];
  });
}

function toRange(codepoints) {
  const sorted = [...codepoints].sort((x, y) => x - y);
  const parts = [];
  let start = sorted[0];
  let prev = sorted[0];
  const hex = (n) => n.toString(16).toUpperCase().padStart(4, "0");
  for (const cp of [...sorted.slice(1), Number.NaN]) {
    if (cp === prev + 1) {
      prev = cp;
      continue;
    }
    parts.push(start === prev ? `U+${hex(start)}` : `U+${hex(start)}-${hex(prev)}`);
    start = cp;
    prev = cp;
  }
  return parts.join(", ");
}

const from = process.argv.find((a) => a.startsWith("--from="))?.slice("--from=".length);
const input = from ? resolve(from) : defaultInput();

// Every codepoint the font maps, from fontTools itself.
const cmap = JSON.parse(
  execFileSync(
    "python3",
    [
      "-c",
      "import json,sys\nfrom fontTools.ttLib import TTFont\nprint(json.dumps(sorted(TTFont(sys.argv[1]).getBestCmap())))",
      input,
    ],
    { encoding: "utf8" },
  ),
);

const latin = parseRanges(LATIN_RANGE);
const inLatin = (cp) => latin.some(([lo, hi]) => cp >= lo && cp <= hi);
const rest = cmap.filter((cp) => !inLatin(cp));
const restRange = toRange(rest);

mkdirSync(OUT, { recursive: true });
const subset = (unicodes, file) =>
  execFileSync(
    "pyftsubset",
    [
      input,
      `--unicodes=${unicodes}`,
      "--layout-features=*",
      "--flavor=woff2",
      `--output-file=${join(OUT, file)}`,
    ],
    { stdio: "inherit" },
  );
subset(LATIN_RANGE.replaceAll(" ", ""), "geist-sans-latin.woff2");
subset(restRange.replaceAll(" ", ""), "geist-sans-rest.woff2");

writeFileSync(
  join(OUT, "ranges.json"),
  `${JSON.stringify(
    {
      generatedBy: "packages/design/fonts/scripts/subset-geist.mjs",
      source: "geist/dist/fonts/geist-sans/Geist-Variable.woff2",
      latin: LATIN_RANGE,
      rest: restRange,
    },
    null,
    2,
  )}\n`,
);
process.stdout.write(`geist-sans: ${cmap.length} codepoints, ${rest.length} outside latin\n`);
