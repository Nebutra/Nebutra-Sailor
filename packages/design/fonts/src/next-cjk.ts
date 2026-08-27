/**
 * @nebutra/fonts/next/cjk — the self-hosted Simplified-Chinese face (server-only).
 *
 * WHY A SEPARATE ENTRY FROM `./next`: that module declares ~16 `next/font/google`
 * faces for the theme / DESIGN.md registry. Importing it just to get the CJK face
 * would drag those build-time Google downloads into every app — and this repo has
 * a known trap where `next/font/google` fails outright in a network-sandboxed dev
 * server. This file imports `next/font/local` ONLY: the woff2 files live in the
 * workspace `generated/` directory (not the npm tarball), so first-party apps
 * work offline, in CI, and in the sandbox. `./next` re-exports it,
 * so an app already applying `fontRegistryClassName` still only needs one import.
 *
 * WHY SELF-HOSTED AT ALL: Geist has no CJK coverage, so without this every Chinese
 * character falls back to whatever the OS supplies — PingFang on macOS, Microsoft
 * YaHei on Windows, something else on Android. Chinese copy is a first-class
 * surface here (see docs/microcopy/), so the face is pinned rather than left to
 * the OS.
 *
 * The files are built by `pnpm --filter @nebutra/fonts subset:cjk` from
 * Noto Sans SC (SIL OFL) and live in the workspace `generated/` directory.
 * The literal `src` list below mirrors NOTO_SANS_SC_SOURCES in
 * ../generated/index.ts (a drift test in ./next-cjk.test.ts asserts they agree).
 * It is spelled out rather than spread because next/font is a compile-time
 * transform — SWC statically analyses this call, so the options object cannot
 * be computed.
 */

import localFont from "next/font/local";

/**
 * Noto Sans SC — 400 / 500 / 600 / 700 static subsets.
 *
 * - `preload: false` on purpose. Each weight is hundreds of KB; preloading them
 *   on every route would tax Latin-only pages for nothing. The browser fetches
 *   a weight only when a glyph in the `unicode-range` below actually renders.
 * - `declarations` carries that `unicode-range` (CJK blocks only — no ASCII, no
 *   Latin, no general punctuation), so a Latin-only page can never trigger a CJK
 *   download even if a font stack somewhere is written the wrong way round.
 * - `adjustFontFallback: false` — next/font's metric-matched fallback is derived
 *   from Arial, which is meaningless for a Han face.
 */
export const notoSansSc = localFont({
  src: [
    { path: "../generated/noto-sans-sc-400.woff2", weight: "400", style: "normal" },
    { path: "../generated/noto-sans-sc-500.woff2", weight: "500", style: "normal" },
    { path: "../generated/noto-sans-sc-600.woff2", weight: "600", style: "normal" },
    { path: "../generated/noto-sans-sc-700.woff2", weight: "700", style: "normal" },
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
  variable: "--font-noto-sans-sc",
});

/**
 * Apply to <html> next to the Geist loaders so `--font-noto-sans-sc` exists:
 *
 *   className={`${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName}`}
 *
 * The token stacks (`--font-sans` / `--font-cn` / `--font-display` in
 * @nebutra/tokens) reference the variable AFTER Geist, so Geist keeps Latin and
 * the numerals and only CJK falls through to this face.
 */
export const cjkFontClassName = notoSansSc.variable;
