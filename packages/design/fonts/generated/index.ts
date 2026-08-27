/**
 * GENERATED FILE — face metadata for `@nebutra/fonts/next/cjk`.
 * Current binaries are SIL OFL Noto Sans SC (chinese-simplified) woff2 files.
 * Rebuild with `pnpm --filter @nebutra/fonts subset:cjk` when FONTTOOLS_PYTHON
 * is available, or replace the woff2 files from an OFL source.
 */

export const NOTO_SANS_SC_VARIABLE = "--font-noto-sans-sc" as const;

export const NOTO_SANS_SC_FAMILY = "Noto Sans SC" as const;

/** Characters covered per face (catalogs ∪ CJK punctuation ∪ GB2312 level-1). */
export const NOTO_SANS_SC_CHAR_COUNT = 4282 as const;

/** `unicode-range` of every generated @font-face — CJK only, no Latin. */
export const NOTO_SANS_SC_UNICODE_RANGE =
  "U+3000-303F, U+3400-4DBF, U+4E00-9FFF, U+F900-FAFF, U+FE30-FE4F, U+FF00-FFEF" as const;

/** Sources for `next/font/local({ src: [...] })`, paths relative to this file. */
export const NOTO_SANS_SC_SOURCES = [
  { path: "./noto-sans-sc-400.woff2", weight: "400", style: "normal", bytes: 1142552 },
  { path: "./noto-sans-sc-500.woff2", weight: "500", style: "normal", bytes: 1159128 },
  { path: "./noto-sans-sc-600.woff2", weight: "600", style: "normal", bytes: 1162352 },
  { path: "./noto-sans-sc-700.woff2", weight: "700", style: "normal", bytes: 1172244 },
] as const;
