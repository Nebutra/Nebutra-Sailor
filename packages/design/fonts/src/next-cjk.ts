/**
 * @nebutra/fonts/next/cjk — the self-hosted Simplified-Chinese face (server-only).
 *
 * WHY A SEPARATE ENTRY FROM `./next`: that module declares ~16 `next/font/google`
 * faces for the theme / DESIGN.md registry. Importing it just to get the CJK face
 * would drag those build-time Google downloads into every app — and this repo has
 * a known trap where `next/font/google` fails outright in a network-sandboxed dev
 * server. This file imports `next/font/local` ONLY: the woff2 files ship in the
 * package, so it works offline, in CI, and in the sandbox. `./next` re-exports it,
 * so an app already applying `fontRegistryClassName` still only needs one import.
 *
 * WHY SELF-HOSTED AT ALL: Geist has no CJK coverage, so without this every Chinese
 * character falls back to whatever the OS supplies — PingFang on macOS, Microsoft
 * YaHei on Windows, something else on Android. Chinese copy is a first-class
 * surface here (see docs/microcopy/), so the face is pinned rather than left to
 * the OS.
 *
 * The files are built by `pnpm --filter @nebutra/fonts subset:cjk`; the literal
 * `src` list below mirrors VIVO_SANS_CN_SOURCES in ../generated/index.ts (a drift
 * test in ./next-cjk.test.ts asserts they agree). It is spelled out rather than
 * spread because next/font is a compile-time transform — SWC statically analyses
 * this call, so the options object cannot be computed.
 *
 * FONT ATTRIBUTION (vivo Sans 字体知识产权许可协议 clause 2.1):
 *   您应在软件中特别注明使用了vivo Sans 字体 — this software uses the vivo Sans
 *   typeface. See ../vendor/vivo-sans/LICENCE-vivo-Sans.txt and the package README.
 */

import localFont from "next/font/local";

/**
 * vivo Sans SC — 400 / 500 / 600 / 700 static subsets.
 *
 * - `preload: false` on purpose. Each weight is ~490 KB; preloading them on every
 *   route would tax Latin-only pages for nothing. The browser fetches a weight
 *   only when a glyph in the `unicode-range` below actually renders.
 * - `declarations` carries that `unicode-range` (CJK blocks only — no ASCII, no
 *   Latin, no general punctuation), so a Latin-only page can never trigger a CJK
 *   download even if a font stack somewhere is written the wrong way round. Curly
 *   quotes, the em dash and the ellipsis are deliberately left to Geist: they are
 *   the codepoints Latin and Chinese copy share.
 * - `adjustFontFallback: false` — next/font's metric-matched fallback is derived
 *   from Arial, which is meaningless for a Han face and would add a size-adjusted
 *   ghost face into the same family.
 * - 700 is a real Bold subset (not synthetic). Without it, CSS weight matching
 *   collapses 700 → 600 and the mixed-script ladder flattens against Geist.
 *   `font-synthesis: none` still forbids faux bold for any weight we do not ship.
 */
export const vivoSansCn = localFont({
  src: [
    { path: "../generated/vivo-sans-sc-400.woff2", weight: "400", style: "normal" },
    { path: "../generated/vivo-sans-sc-500.woff2", weight: "500", style: "normal" },
    { path: "../generated/vivo-sans-sc-600.woff2", weight: "600", style: "normal" },
    { path: "../generated/vivo-sans-sc-700.woff2", weight: "700", style: "normal" },
  ],
  declarations: [
    {
      prop: "unicode-range",
      value: "U+3000-303F, U+3400-4DBF, U+4E00-9FFF, U+F900-FAFF, U+FE30-FE4F, U+FF00-FFEF",
    },
  ],
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-vivo-sans-sc",
});

/**
 * Apply to <html> next to the Geist loaders so `--font-vivo-sans-sc` exists:
 *
 *   className={`${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName}`}
 *
 * The token stacks (`--font-sans` / `--font-cn` / `--font-display` in
 * @nebutra/tokens) reference the variable AFTER Geist, so Geist keeps Latin and
 * the numerals and only CJK falls through to this face.
 */
export const cjkFontClassName = vivoSansCn.variable;
