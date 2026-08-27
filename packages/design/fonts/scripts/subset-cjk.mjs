#!/usr/bin/env node
/**
 * subset-cjk.mjs — build the self-hosted Simplified-Chinese web faces.
 *
 * WHY THIS EXISTS
 * Geist has zero CJK coverage, so every Chinese character in the product falls
 * back to whatever the OS ships (PingFang on macOS, Microsoft YaHei on Windows,
 * something else again on Android). Chinese copy is a first-class surface here
 * (see docs/microcopy/), so the CJK face has to be ours and it has to be
 * self-hosted. vivo Sans SC covers the common set correctly; the only problem is
 * delivery — 7.4MB per static face, 42MB for the variable one. This script cuts
 * each static face down to the characters the product can actually render.
 *
 * WHY THE *STATIC* FACES, NOT THE VARIABLE ONE
 * `OS/Chinese/Simplified Chinese/vivo Sans SC/vivoSansSCVF.ttf` is a 42MB
 * variable font. Subset to the catalog character set it is still 1,070,240 B,
 * because a variable CJK font carries per-weight deltas for every single glyph it
 * keeps. The static `Brand/vivo Sans简体/vivoSans-*.ttf` faces subset to 191,108 B
 * for the catalog set and ~498,000 B once the common-character floor is added —
 * so one variable file costs more than a static weight, and the browser only
 * fetches the weights a page actually uses.
 *
 * WHY NOT `vivo Sans SC L3`
 * It has 60,339 characters but ZERO in the CJK basic block — it is a rare-plane
 * supplement, not a body face. Using it as the body face renders nothing.
 *
 * CHARACTER SET = catalogs (glob) ∪ punctuation ∪ GB2312 level-1 floor
 * See collectCharacterSet() for the reasoning on each of the three inputs.
 *
 * Idempotent: a manifest records the input fingerprint (charset + source bytes +
 * subsetter options). Unchanged inputs skip the pyftsubset run; sizes are still
 * reported every time. `--force` rebuilds regardless.
 *
 * Requires: python3 with fontTools >= 4.x and brotli (for `--flavor=woff2`).
 * `woff2_compress` is NOT required — pyftsubset's own woff2 flavor is used.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PKG_DIR, "../../..");
const VENDOR_DIR = join(PKG_DIR, "vendor", "vivo-sans");
const OUT_DIR = join(PKG_DIR, "generated");
const MANIFEST_PATH = join(OUT_DIR, "subset-manifest.json");
const CSS_PATH = join(OUT_DIR, "vivo-sans-cn.css");
const TS_PATH = join(OUT_DIR, "index.ts");

const FORCE = process.argv.includes("--force");

/** Where the licensed originals live when vendoring for the first time. */
const UPSTREAM_DIR =
  process.env.VIVO_SANS_SOURCE_DIR ??
  join(process.env.HOME ?? "", "Desktop/Design-System/Nebutra/vivo Sans/Brand/vivo Sans简体");
const UPSTREAM_LICENCE = resolve(UPSTREAM_DIR, "../../vivo Sans字体知识产权许可协议.txt");
const VENDOR_LICENCE = join(PKG_DIR, "vendor", "vivo-sans", "LICENCE-vivo-Sans.txt");

/**
 * The weights we ship — deliberately three, not nine.
 *
 * The design system's numeric slots are `--font-weight-medium: 500` and
 * `--font-weight-heading: 600` (packages/design/tokens/recipe.css), and the
 * token CSS writes literal `font-weight` in only four values, by frequency:
 * 500 (43×), 600 (35×), 400 (27×), 700 (10×).
 *
 * So: 400 body, 500 UI/medium, 600 heading. 700 is dropped and resolves to the
 * 600 face via normal CSS font matching — and because the matched face is itself
 * >= 600, no browser applies synthetic (faux) bold, which is exactly why the
 * third face is DemiBold 600 rather than Bold 700. Picking 700 instead would
 * leave the *default* heading weight (600, the most common heading value in the
 * system) synthesising or jumping a step.
 *
 * The skins also declare fractional weights (300 / 450 / 510) — those are
 * variable-font values and likewise resolve into this set. A CJK face costs
 * ~490KB per weight; shipping all nine static faces would be ~4.4MB for no
 * visible gain.
 */
const FACES = [
  { weight: 400, file: "vivoSans-Regular.ttf", out: "vivo-sans-sc-400.woff2" },
  { weight: 500, file: "vivoSans-Medium.ttf", out: "vivo-sans-sc-500.woff2" },
  { weight: 600, file: "vivoSans-DemiBold.ttf", out: "vivo-sans-sc-600.woff2" },
  // 700 exists because without it the mixed-script weight ladder breaks at the
  // top. Measured ink coverage over the advance box, faces force-loaded so the
  // canvas could not silently rasterise a fallback:
  //   Geist 400/500/600/700 → 8.31 / 10.14 / 11.91 / 13.65 %   (a clean ladder)
  //   vivo  400/500/600/700 → 16.40 / 18.99 / 20.42 / 20.42 %  (flat from 600)
  // The flat step is what happens when 700 resolves down to the 600 face: the
  // Latin keeps getting heavier and the Chinese beside it stops, so a bold run
  // in mixed copy reads as the English shouting over the Chinese. Shipping a
  // real Bold face costs one more file, only fetched by pages that use 700.
  { weight: 700, file: "vivoSans-Bold.ttf", out: "vivo-sans-sc-700.woff2" },
];

/**
 * unicode-range for the generated @font-face rules.
 *
 * THE ORDER IS THE DESIGN DECISION, and this range is its enforcement. Geist
 * keeps Latin and the numerals — its tabular figures and tighter x-height are
 * what dense dashboard tables need, and it is the locked UI face. The app stack
 * is therefore "Geist, vivo Sans SC, …": both faces cover Latin, so whichever
 * comes FIRST wins Latin, and CJK falls through to vivo Sans. Reversed, vivo
 * Sans would also take the Latin, and its Latin is not as good as Geist's for UI.
 *
 * Belt and braces: the range below contains NO Latin, no ASCII and no
 * general-punctuation codepoints, so a purely Latin page can never trigger a
 * CJK download even if some stack somewhere is written the wrong way round.
 * Curly quotes and the em dash (U+2014, U+2018–201D, U+2026) are deliberately
 * left to Geist for the same reason — they are the codepoints Latin copy shares.
 */
const UNICODE_RANGES = [
  "U+3000-303F", // CJK symbols and punctuation — 、。「」《》〈〉
  "U+3400-4DBF", // CJK Unified Ideographs Extension A
  "U+4E00-9FFF", // CJK Unified Ideographs (the basic block)
  "U+F900-FAFF", // CJK Compatibility Ideographs
  "U+FE30-FE4F", // CJK compatibility forms (vertical punctuation)
  "U+FF00-FFEF", // Halfwidth and fullwidth forms — ，！？：；（） and fullwidth latin
];

/** Codepoint predicate matching UNICODE_RANGES above. */
const RANGE_BOUNDS = UNICODE_RANGES.map((r) => {
  const [lo, hi] = r.slice(2).split("-");
  return [Number.parseInt(lo, 16), Number.parseInt(hi ?? lo, 16)];
});
const inRange = (cp) => RANGE_BOUNDS.some(([lo, hi]) => cp >= lo && cp <= hi);

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".open-next",
  ".turbo",
  ".git",
  "dist",
  "build",
  "coverage",
  "storybook-static",
  "generated",
  "vendor",
]);

/** Recursively find every `zh*.json` living in a `messages/` or `locales/` dir. */
function findZhCatalogs(dir, found = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      findZhCatalogs(full, found);
    } else if (
      entry.isFile() &&
      /^zh[^/]*\.json$/.test(entry.name) &&
      /(^|[/\\])(messages|locales)$/.test(dir)
    ) {
      found.push(full);
    }
  }
  return found;
}

/** Every string leaf of a parsed JSON catalog. */
function* stringLeaves(node) {
  if (typeof node === "string") {
    yield node;
  } else if (Array.isArray(node)) {
    for (const item of node) yield* stringLeaves(item);
  } else if (node && typeof node === "object") {
    for (const value of Object.values(node)) yield* stringLeaves(value);
  }
}

/**
 * The GB2312 level-1 character set (一级汉字, 3,755 characters, rows 0xB0A1–0xD7F9).
 *
 * WHY A FLOOR AT ALL. The catalogs only cover *our* copy. Product surfaces render
 * *user* data — a person's name, a company, a city — and a single character
 * falling back to PingFang mid-sentence is more noticeable than not using the
 * font at all: different weight, different width, different vertical metrics on
 * one glyph inside a word.
 *
 * WHY THIS LIST. The conventional floor is the 通用规范汉字表 一级字表 (3,500
 * 常用字). GB2312 level-1 is a 3,755-character superset of essentially that set,
 * and — the deciding factor — it is *derivable in-process* from the platform's
 * own GB2312 decoder. No 3,500-entry list to vendor, review, or let rot; the
 * floor is reproducible from the standard itself on every run. It covers >99.5%
 * of running modern Chinese text. Level 2 (a further ~3,000 rare characters,
 * mostly rare surname and place-name glyphs) is intentionally excluded: it would
 * roughly double each file for characters that appear in a fraction of a percent
 * of text, and those genuinely rare glyphs are what OS fallback is for.
 */
function gb2312Level1() {
  const decoder = new TextDecoder("gb2312", { fatal: false });
  const chars = new Set();
  for (let hi = 0xb0; hi <= 0xd7; hi++) {
    const lastLo = hi === 0xd7 ? 0xf9 : 0xfe;
    for (let lo = 0xa1; lo <= lastLo; lo++) {
      const decoded = decoder.decode(new Uint8Array([hi, lo]));
      if (decoded.length !== 1 || decoded === "�") continue;
      const cp = decoded.codePointAt(0);
      if (inRange(cp)) chars.add(decoded);
    }
  }
  return chars;
}

/**
 * CJK punctuation and fullwidth forms, unconditionally.
 *
 * Chinese text whose 、。！？（） are set in a *different* face than its
 * characters looks broken in a way people notice immediately — the marks sit on
 * a different baseline and occupy a different advance width. These blocks are
 * small (~200 glyphs) so they are included wholesale rather than only where the
 * catalogs happen to use them.
 */
function punctuationFloor() {
  const chars = new Set();
  const blocks = [
    [0x3000, 0x303f],
    [0xfe30, 0xfe4f],
    [0xff01, 0xff5e],
    [0xffe0, 0xffe6],
  ];
  for (const [lo, hi] of blocks) {
    for (let cp = lo; cp <= hi; cp++) chars.add(String.fromCodePoint(cp));
  }
  return chars;
}

function collectCharacterSet() {
  const catalogs = findZhCatalogs(REPO_ROOT).sort();
  const fromCatalogs = new Set();
  for (const file of catalogs) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      throw new Error(`Unparseable zh catalog ${relative(REPO_ROOT, file)}: ${error.message}`);
    }
    for (const text of stringLeaves(parsed)) {
      for (const char of text) {
        const cp = char.codePointAt(0);
        if (inRange(cp)) fromCatalogs.add(char);
      }
    }
  }

  const punctuation = punctuationFloor();
  const floor = gb2312Level1();
  const all = new Set([...fromCatalogs, ...punctuation, ...floor]);

  return {
    catalogs,
    fromCatalogs,
    punctuation,
    floor,
    // Sorted so the charset (and therefore the fingerprint) is deterministic.
    chars: [...all].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)),
  };
}

/** Copy the originals into vendor/ on first run so the build is self-contained. */
function ensureVendoredSources() {
  mkdirSync(VENDOR_DIR, { recursive: true });
  const missing = [];
  for (const face of FACES) {
    const target = join(VENDOR_DIR, face.file);
    if (existsSync(target)) continue;
    const upstream = join(UPSTREAM_DIR, face.file);
    if (existsSync(upstream)) {
      copyFileSync(upstream, target);
      log(`vendored ${face.file} from ${UPSTREAM_DIR}`);
    } else {
      missing.push(face.file);
    }
  }
  if (!existsSync(VENDOR_LICENCE) && existsSync(UPSTREAM_LICENCE)) {
    copyFileSync(UPSTREAM_LICENCE, VENDOR_LICENCE);
    log(`vendored ${basename(VENDOR_LICENCE)}`);
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing vendored source faces: ${missing.join(", ")}\n` +
        `Place them in ${relative(REPO_ROOT, VENDOR_DIR)} or set VIVO_SANS_SOURCE_DIR ` +
        `to the licensed "Brand/vivo Sans简体" directory.`,
    );
  }
  if (!existsSync(VENDOR_LICENCE)) {
    throw new Error(
      `Missing licence text at ${relative(REPO_ROOT, VENDOR_LICENCE)} — the vivo Sans ` +
        `licence agreement must be committed alongside the fonts.`,
    );
  }
}

/**
 * pyftsubset options.
 *
 * Hinting is KEPT (no `--no-hinting`): DirectWrite/GDI on Windows still uses TT
 * instructions for CJK at UI sizes, and dropping them saves single-digit KB here
 * while visibly degrading small text on the one platform that has no good
 * fallback face of its own.
 */
const SUBSET_OPTIONS = [
  "--flavor=woff2",
  "--layout-features=kern,liga,clig,calt,ccmp,locl,palt,halt,vert,vrt2",
  "--no-subset-tables+=DSIG",
  "--drop-tables+=DSIG",
  "--recalc-bounds",
  "--recalc-average-width",
];

/**
 * Characters we asked for that the source face does not actually contain.
 *
 * pyftsubset drops these silently, and they stay inside the declared
 * unicode-range, so the browser falls through to the next family in the stack
 * for them — correct behaviour, but it must be visible rather than silent, or a
 * genuine coverage hole in a future source face would go unnoticed.
 */
function findUncoveredChars(sourcePath, charsFilePath) {
  const script = [
    "import sys",
    "from fontTools.ttLib import TTFont",
    "font = TTFont(sys.argv[1], lazy=True)",
    "covered = set()",
    "for table in font['cmap'].tables: covered |= set(table.cmap.keys())",
    "want = open(sys.argv[2], encoding='utf8').read()",
    "sys.stdout.write(''.join(c for c in want if ord(c) not in covered))",
  ].join("\n");
  const missing = execFileSync("python3", ["-c", script, sourcePath, charsFilePath], {
    encoding: "utf8",
  });
  return [...missing];
}

const log = (message) => process.stdout.write(`${message}\n`);
const fmtBytes = (bytes) => `${(bytes / 1024).toFixed(1).padStart(8)} KB  (${bytes} B)`;

function fingerprint(charsetFingerprint) {
  const hash = createHash("sha256");
  hash.update(charsetFingerprint);
  hash.update(JSON.stringify(SUBSET_OPTIONS));
  hash.update(JSON.stringify(UNICODE_RANGES));
  for (const face of FACES) {
    const stats = statSync(join(VENDOR_DIR, face.file));
    hash.update(`${face.file}:${face.weight}:${stats.size}`);
  }
  return hash.digest("hex");
}

function renderCss(results, charCount) {
  const ranges = UNICODE_RANGES.join(", ");
  return `/*
 * vivo-sans-cn.css — GENERATED FILE, DO NOT EDIT.
 * Written by packages/design/fonts/scripts/subset-cjk.mjs (\`pnpm --filter
 * @nebutra/fonts subset:cjk\`). Re-run it after adding Chinese copy; the
 * character set is collected from the repo's zh* message catalogs by glob.
 *
 * ${charCount} characters per face. Source: vivo Sans SC (static Brand faces),
 * licensed — see vendor/vivo-sans/LICENCE-vivo-Sans.txt. Per clause 2.1 of that
 * agreement: 您应在软件中特别注明使用了vivo Sans 字体 / this software uses the
 * vivo Sans typeface.
 *
 * STACK ORDER: use "Geist, vivo Sans SC, …" — Geist first so it keeps Latin and
 * the numerals (tabular figures, tighter x-height), with CJK falling through to
 * vivo Sans SC. The unicode-range below contains no Latin, ASCII or general
 * punctuation, so Latin-only text never downloads a CJK file.
 *
 * font-display: swap — the fallback (PingFang / YaHei) paints immediately and is
 * replaced when the subset arrives; CJK text must never be invisible.
 */
${results
  .map(
    (face) => `
@font-face {
  font-family: "vivo Sans SC";
  font-style: normal;
  font-weight: ${face.weight};
  font-display: swap;
  src: url("./${face.out}") format("woff2");
  unicode-range: ${ranges};
}`,
  )
  .join("\n")}
`;
}

function renderTs(results, charCount) {
  return `/**
 * GENERATED FILE, DO NOT EDIT.
 * Written by packages/design/fonts/scripts/subset-cjk.mjs.
 *
 * Metadata for the self-hosted Simplified-Chinese faces, in the shape
 * \`next/font/local\` expects, so the server entry (\`@nebutra/fonts/next\`) can
 * declare the face without re-stating weights or file names. The plain
 * \`vivo-sans-cn.css\` next to this file is the non-Next consumer path.
 *
 * The registry key is "vivo sans sc" (see FONT_REGISTRY in ../src/index.ts);
 * the CSS variable is ${JSON.stringify(cssVariable())}.
 */

export const VIVO_SANS_CN_VARIABLE = ${JSON.stringify(cssVariable())} as const;

export const VIVO_SANS_CN_FAMILY = "vivo Sans SC" as const;

/** Characters covered per face (catalogs ∪ CJK punctuation ∪ GB2312 level-1). */
export const VIVO_SANS_CN_CHAR_COUNT = ${charCount} as const;

/** \`unicode-range\` of every generated @font-face — CJK only, no Latin. */
export const VIVO_SANS_CN_UNICODE_RANGE = ${JSON.stringify(UNICODE_RANGES.join(", "))} as const;

/** Sources for \`next/font/local({ src: [...] })\`, paths relative to this file. */
export const VIVO_SANS_CN_SOURCES = [
${results
  .map(
    (face) =>
      `  { path: "./${face.out}", weight: "${face.weight}", style: "normal", bytes: ${face.bytes} },`,
  )
  .join("\n")}
] as const;
`;
}

const cssVariable = () => "--font-vivo-sans-sc";

function main() {
  ensureVendoredSources();
  mkdirSync(OUT_DIR, { recursive: true });

  const set = collectCharacterSet();
  const charsetText = set.chars.join("");
  const charsetHash = createHash("sha256").update(charsetText).digest("hex");

  log("");
  log("vivo Sans SC — CJK subset build");
  log(`  zh catalogs found      ${set.catalogs.length}`);
  for (const file of set.catalogs) log(`    - ${relative(REPO_ROOT, file)}`);
  log(`  chars from catalogs    ${set.fromCatalogs.size}`);
  log(`  punctuation floor      ${set.punctuation.size}`);
  log(`  GB2312 level-1 floor   ${set.floor.size}`);
  log(`  total unique chars     ${set.chars.length}`);
  log("");

  const charsFile = join(OUT_DIR, "charset.txt");
  writeFileSync(charsFile, charsetText, "utf8");

  const uncovered = findUncoveredChars(join(VENDOR_DIR, FACES[0].file), charsFile);
  if (uncovered.length > 0) {
    log(
      `  ${uncovered.length} requested chars absent from the source face ` +
        `(fall through to the next family in the stack):`,
    );
    log(`    ${uncovered.join("")}`);
    log("");
  }

  const inputHash = fingerprint(charsetHash);
  const previous = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
    : undefined;
  const outputsPresent = FACES.every((face) => existsSync(join(OUT_DIR, face.out)));
  const upToDate = !FORCE && previous?.inputHash === inputHash && outputsPresent;

  const results = [];
  for (const face of FACES) {
    const source = join(VENDOR_DIR, face.file);
    const output = join(OUT_DIR, face.out);
    if (!upToDate) {
      execFileSync(
        "python3",
        [
          "-m",
          "fontTools.subset",
          source,
          `--text-file=${charsFile}`,
          `--output-file=${output}`,
          ...SUBSET_OPTIONS,
        ],
        { stdio: ["ignore", "ignore", "inherit"] },
      );
    }
    results.push({
      ...face,
      bytes: statSync(output).size,
      sourceBytes: statSync(source).size,
    });
  }

  writeFileSync(CSS_PATH, renderCss(results, set.chars.length), "utf8");
  writeFileSync(TS_PATH, renderTs(results, set.chars.length), "utf8");
  writeFileSync(
    MANIFEST_PATH,
    `${JSON.stringify(
      {
        generatedBy: "packages/design/fonts/scripts/subset-cjk.mjs",
        inputHash,
        charsetHash,
        charCount: set.chars.length,
        charsFromCatalogs: set.fromCatalogs.size,
        punctuationFloor: set.punctuation.size,
        gb2312Level1Floor: set.floor.size,
        uncoveredBySourceFace: uncovered.join(""),
        catalogs: set.catalogs.map((file) => relative(REPO_ROOT, file)),
        unicodeRange: UNICODE_RANGES,
        subsetOptions: SUBSET_OPTIONS,
        faces: results.map(({ weight, file, out, bytes, sourceBytes }) => ({
          weight,
          source: file,
          sourceBytes,
          output: out,
          bytes,
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  // Derived, not typed. A hardcoded count is wrong the moment a weight is added,
  // and a build log that quietly understates what it did is how a missing face
  // goes unnoticed.
  log(
    upToDate
      ? "  inputs unchanged — subsetting skipped"
      : `  subsetted ${FACES.length} face${FACES.length === 1 ? "" : "s"}`,
  );
  log("");
  let total = 0;
  for (const face of results) {
    total += face.bytes;
    const ratio = ((face.bytes / face.sourceBytes) * 100).toFixed(2);
    log(`  ${face.out.padEnd(24)} ${fmtBytes(face.bytes)}   ${ratio}% of ${face.file}`);
  }
  for (const file of [CSS_PATH, TS_PATH, MANIFEST_PATH]) {
    log(`  ${basename(file).padEnd(24)} ${fmtBytes(statSync(file).size)}`);
  }
  log("");
  log(`  woff2 total            ${fmtBytes(total)}`);
  log("");
}

main();
