/**
 * @nebutra/fonts/next/geist — Geist Sans in two files (server-only).
 *
 * `geist/font/sans` loads one ~69 KB variable woff2 and preloads it on every
 * page. This loads the same face split in two by `scripts/subset-geist.mjs`:
 *
 *  - `geist-sans-latin.woff2` (~32 KB): Google Fonts' `latin` range plus arrows and check marks. Preloaded —
 *    it is the body face of every Latin-script page.
 *  - `geist-sans-rest.woff2` (~46 KB): every other glyph (Latin Extended,
 *    Vietnamese, Cyrillic, Greek, symbols). Not preloaded; the browser fetches
 *    it only when a page has a character in its range.
 *
 * Both @font-face rules share the family name the package uses ("GeistSans"),
 * the variable (`--font-geist-sans`), the weight axis (100–900) and the Arial
 * metric fallback, so text renders exactly as before — an English page just
 * stops downloading the 37 KB it never draws. Subsetting removes glyphs and
 * never alters one (SIL OFL 1.1; `vendor/geist/OFL.txt`).
 *
 * next/font is a compile-time transform: options are literals, so the ranges
 * are spelled out here; `next-geist.test.ts` keeps them equal to
 * `generated/geist-sans/ranges.json`.
 */

import localFont from "next/font/local";

export const geistSans = localFont({
  src: "../generated/geist-sans/geist-sans-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  declarations: [
    { prop: "font-family", value: "'GeistSans'" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2190-21FF, U+2212, U+2215, U+2713-2717, U+FEFF, U+FFFD",
    },
  ],
});

/**
 * The rest of the face. Rendering its class name (`geistSansRest.variable`)
 * next to `geistSans.variable` is what puts this @font-face in the page's CSS.
 */
export const geistSansRest = localFont({
  src: "../generated/geist-sans/geist-sans-rest.woff2",
  variable: "--font-geist-sans-rest",
  weight: "100 900",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: "font-family", value: "'GeistSans'" },
    {
      prop: "unicode-range",
      value:
        "U+0100-0113, U+0116-012B, U+012E-0130, U+0132-0137, U+0139-013E, U+0141-0148, U+014A-014D, U+0150-0151, U+0154-017E, U+018F, U+0192, U+01A0-01A1, U+01AF-01B0, U+01CD-01CE, U+01E4-01E9, U+0218-021B, U+0237, U+0259, U+02B9, U+02C7-02C8, U+02D8-02D9, U+02DB, U+02DD, U+0300-0303, U+0306-0307, U+0309-030C, U+0312, U+031B, U+0323, U+0326-0328, U+0335-0338, U+039B, U+03A9, U+03BB-03BC, U+03C0, U+03C9, U+0400-045F, U+0462-0463, U+046A-046B, U+0472-0475, U+0490-0493, U+0496-0497, U+049A-049B, U+04A2-04A3, U+04AE-04B3, U+04B6-04B7, U+04BA-04BB, U+04C0, U+04CF, U+04D8-04D9, U+04E2-04E3, U+04E8-04E9, U+04EE-04EF, U+0E3F, U+1E20-1E21, U+1E80-1E85, U+1E9E, U+1EA0-1EF9, U+2070, U+2074-2079, U+2080-2089, U+20AA, U+20B1, U+20B4, U+20B9, U+20BD, U+2116-2117, U+2153-2155, U+215B-215E, U+2202, U+2206, U+220F, U+2211, U+221A, U+221E, U+222B, U+2236, U+2248, U+2260, U+2264-2265, U+2460-2468, U+24EA, U+24FF, U+25B2-25B3, U+25B6-25B7, U+25BC-25BD, U+25C0-25C1, U+25CA-25CC, U+25CF, U+2639-263A, U+2776-277E, U+3003, U+301C, U+A78B-A78C, U+F8FF, U+FB01-FB02",
    },
  ],
});

/** Both class names, for <html>: `${geistSansClassName} ...`. */
export const geistSansClassName = `${geistSans.variable} ${geistSansRest.variable}`;

/**
 * Geist Mono, from the `geist` package's own variable file (vendored next to
 * the Sans split, SIL OFL 1.1) and NOT preloaded. `geist/font/mono` preloads its
 * 72 KB file on every page, and few pages set mono text above the fold (code
 * blocks, readouts), so the preload competed with the LCP text for the first
 * bytes. The face still loads the moment text uses it. Same family name,
 * variable and fallback list as the package's declaration.
 */
export const geistMono = localFont({
  src: "../generated/geist-mono/geist-mono-variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "font-family", value: "'GeistMono'" }],
  fallback: [
    "ui-monospace",
    "SFMono-Regular",
    "Roboto Mono",
    "Menlo",
    "Monaco",
    "Liberation Mono",
    "DejaVu Sans Mono",
    "Courier New",
    "monospace",
  ],
});
