#!/usr/bin/env node
/**
 * subset-cjk.mjs — build the self-hosted Simplified-Chinese web faces.
 *
 * WHY THIS EXISTS
 * Geist has zero CJK coverage, so every Chinese character in the product falls
 * back to whatever the OS ships (PingFang on macOS, Microsoft YaHei on Windows,
 * something else again on Android). Chinese copy is a first-class surface here
 * (see docs/microcopy/), so the CJK face has to be ours and it has to be
 * self-hosted. MiSans (Xiaomi; free for commercial use, embedding allowed with
 * attribution — see vendor/misans/LICENSE.txt) is the face the Chinese AI
 * products we measure against ship (MiniMax, Moonshot). This script cuts each
 * static weight down to the characters the product can actually render —
 * subsetting removes glyphs and never alters one, which the MiSans FAQ permits
 * ("不得…进行外观上的更改" forbids changing appearance, not trimming coverage).
 *
 * WHY THE *STATIC* FACES, NOT THE VARIABLE ONE
 * The MiSans variable face is ~20MB. Xiaomi ships static weights; subsetting
 * each one keeps Latin-only pages from downloading a variable CJK file, and the
 * browser only fetches the weights a page uses.
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
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(PKG_DIR, "../../..");
const VENDOR_DIR = join(PKG_DIR, "vendor", "misans");
const OUT_DIR = join(PKG_DIR, "generated");
const MANIFEST_PATH = join(OUT_DIR, "subset-manifest.json");
const TS_PATH = join(OUT_DIR, "index.ts");
const PYTHON = process.env.FONTTOOLS_PYTHON ?? "python3";
/** Xiaomi's official package (~220MB). MISANS_ZIP points at a local copy to skip the download. */
const MISANS_ZIP_URL =
  process.env.MISANS_ZIP_URL ?? "https://hyperos.mi.com/font-download/MiSans.zip";
const MISANS_ZIP = process.env.MISANS_ZIP;

/**
 * MiSans binaries are NEVER committed. The repo is public and mirrored as a
 * template, and the MiSans licence forbids distributing the font software on
 * its own — the same reason vivo Sans was removed (b5e73db35). The subsets are
 * uploaded to the deployment's public asset bucket under R2_PREFIX, and only
 * their keys are committed: <CjkFontFace /> (../src/cjk-font-face.tsx) joins
 * each key with publicAssetUrl(), so the host comes from the brand config and
 * env like every other public asset, never from this file. Filenames carry a
 * content hash so the CDN can cache them forever.
 */
const R2_BUCKET = process.env.MISANS_R2_BUCKET;
const R2_PREFIX = "fonts/misans";
const UPLOAD = process.argv.includes("--upload");

const FORCE = process.argv.includes("--force");

const VENDOR_LICENCE = join(VENDOR_DIR, "LICENSE.txt");

/**
 * The weights we ship — four static faces, not nine.
 *
 * 400 body, 500 headings (`--font-weight-heading`, packages/design/tokens/
 * recipe.css) and UI medium, 600 and 700 because the token CSS writes both as
 * literal `font-weight`. Skin-declared fractional weights (300 / 450 / 510)
 * resolve into this set by normal CSS font matching. A CJK face costs ~525KB
 * per weight, and unicode-range plus per-weight @font-face mean a page only
 * downloads the weights it renders.
 */
const FACES = [
  { weight: 400, file: "MiSans-Regular.ttf", out: "misans-400.woff2" },
  { weight: 500, file: "MiSans-Medium.ttf", out: "misans-500.woff2" },
  { weight: 600, file: "MiSans-Semibold.ttf", out: "misans-600.woff2" },
  { weight: 700, file: "MiSans-Bold.ttf", out: "misans-700.woff2" },
];

/**
 * unicode-range for the generated @font-face rules.
 *
 * THE ORDER IS THE DESIGN DECISION, and this range is its enforcement. Geist
 * keeps Latin and the numerals — its tabular figures and tighter x-height are
 * what dense dashboard tables need, and it is the locked UI face. The app stack
 * is therefore "Geist, MiSans, …": both faces cover Latin, so whichever
 * comes FIRST wins Latin, and CJK falls through to MiSans. Reversed, MiSans would
 * also take the Latin, and its Latin is not Geist's for UI.
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

async function downloadFile(url, target) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(target, bytes);
  return bytes.length;
}

/**
 * Extract the static weights we ship from Xiaomi's official package.
 * The licence text is committed (vendor/misans/LICENSE.txt); the .ttf sources
 * are gitignored and re-extracted on demand.
 */
async function ensureVendoredSources() {
  mkdirSync(VENDOR_DIR, { recursive: true });
  if (!existsSync(VENDOR_LICENCE)) {
    throw new Error(
      `${VENDOR_LICENCE} is missing — it is committed with the package; restore it from git.`,
    );
  }
  const missing = FACES.filter((face) => !existsSync(join(VENDOR_DIR, face.file)));
  if (missing.length === 0) return;

  let zip = MISANS_ZIP;
  if (!zip) {
    zip = join(VENDOR_DIR, "MiSans.zip");
    if (!existsSync(zip)) {
      log(
        `downloading MiSans from ${MISANS_ZIP_URL} (~220MB; set MISANS_ZIP to reuse a local copy)`,
      );
      await downloadFile(MISANS_ZIP_URL, zip);
    }
  }
  for (const face of missing) {
    log(`extracting ${face.file}`);
    const bytes = execFileSync("unzip", ["-p", zip, `MiSans/ttf/${face.file}`], {
      maxBuffer: 64 * 1024 * 1024,
    });
    writeFileSync(join(VENDOR_DIR, face.file), bytes);
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
  const missing = execFileSync(PYTHON, ["-c", script, sourcePath, charsFilePath], {
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

function renderTs(results, charCount) {
  return `/**
 * GENERATED FILE, DO NOT EDIT.
 * Written by packages/design/fonts/scripts/subset-cjk.mjs.
 *
 * Metadata for the CDN-hosted MiSans subsets. <CjkFontFace /> in
 * ../src/cjk-font-face.tsx turns it into @font-face rules at render time.
 *
 * The registry key is "misans" (see FONT_REGISTRY in ../src/index.ts);
 * the CSS variable is ${JSON.stringify(cssVariable())}.
 */

export const MISANS_VARIABLE = ${JSON.stringify(cssVariable())} as const;

export const MISANS_FAMILY = "MiSans" as const;

/** Characters covered per face (catalogs ∪ CJK punctuation ∪ GB2312 level-1). */
export const MISANS_CHAR_COUNT = ${charCount} as const;

/** \`unicode-range\` of every generated @font-face — CJK only, no Latin. */
export const MISANS_UNICODE_RANGE = ${JSON.stringify(UNICODE_RANGES.join(", "))} as const;

/** Public-asset keys, one per weight (content-hashed names). No host: see publicAssetUrl(). */
export const MISANS_FILES = [
${results
  .map(
    (face) =>
      `  { key: "${R2_PREFIX}/${face.cdnName}", weight: "${face.weight}", bytes: ${face.bytes} },`,
  )
  .join("\n")}
] as const;
`;
}

const cssVariable = () => "--font-misans";

async function main() {
  await ensureVendoredSources();
  mkdirSync(OUT_DIR, { recursive: true });

  const set = collectCharacterSet();
  const charsetText = set.chars.join("");
  const charsetHash = createHash("sha256").update(charsetText).digest("hex");

  log("");
  log("MiSans — CJK subset build");
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
        PYTHON,
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
    const hash = createHash("sha256").update(readFileSync(output)).digest("hex").slice(0, 10);
    results.push({
      ...face,
      bytes: statSync(output).size,
      sourceBytes: statSync(source).size,
      cdnName: face.out.replace(/\.woff2$/, `.${hash}.woff2`),
    });
  }

  if (UPLOAD) {
    if (!R2_BUCKET)
      throw new Error(
        "--upload needs MISANS_R2_BUCKET (the bucket behind your public asset origin)",
      );
    for (const face of results) {
      log(`uploading ${face.cdnName} → r2://${R2_BUCKET}/${R2_PREFIX}/`);
      execFileSync(
        "npx",
        [
          "wrangler",
          "r2",
          "object",
          "put",
          `${R2_BUCKET}/${R2_PREFIX}/${face.cdnName}`,
          "--file",
          join(OUT_DIR, face.out),
          "--content-type",
          "font/woff2",
          "--cache-control",
          "public, max-age=31536000, immutable",
          "--remote",
        ],
        { stdio: ["ignore", "ignore", "inherit"] },
      );
    }
  }
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
  for (const file of [TS_PATH, MANIFEST_PATH]) {
    log(`  ${basename(file).padEnd(24)} ${fmtBytes(statSync(file).size)}`);
  }
  log("");
  log(`  woff2 total            ${fmtBytes(total)}`);
  log("");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : error}\n`);
  process.exitCode = 1;
});
