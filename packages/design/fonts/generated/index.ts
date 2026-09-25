/**
 * GENERATED FILE, DO NOT EDIT.
 * Written by packages/design/fonts/scripts/subset-cjk.mjs.
 *
 * Metadata for the CDN-hosted MiSans subsets. <CjkFontFace /> in
 * ../src/cjk-font-face.tsx turns it into @font-face rules at render time.
 *
 * The registry key is "misans" (see FONT_REGISTRY in ../src/index.ts);
 * the CSS variable is "--font-misans".
 */

export const MISANS_VARIABLE = "--font-misans" as const;

export const MISANS_FAMILY = "MiSans" as const;

/** Characters covered per face (catalogs ∪ CJK punctuation ∪ GB2312 level-1). */
export const MISANS_CHAR_COUNT = 4330 as const;

/** `unicode-range` of every generated @font-face — CJK only, no Latin. */
export const MISANS_UNICODE_RANGE = "U+3000-303F, U+3400-4DBF, U+4E00-9FFF, U+F900-FAFF, U+FE30-FE4F, U+FF00-FFEF" as const;

/** Public-asset keys, one per weight (content-hashed names). No host: see publicAssetUrl(). */
export const MISANS_FILES = [
  { key: "fonts/misans/misans-400.6bf25dfdf3.woff2", weight: "400", bytes: 535408 },
  { key: "fonts/misans/misans-500.442041bb9d.woff2", weight: "500", bytes: 537060 },
  { key: "fonts/misans/misans-600.2590c17c53.woff2", weight: "600", bytes: 540540 },
  { key: "fonts/misans/misans-700.ddd8bf8017.woff2", weight: "700", bytes: 545728 },
] as const;
