/**
 * @nebutra/fonts/next/display — display italics (server-only).
 *
 * The registry in ./next is upright-only by contract (one src, style normal,
 * `next.test.ts` pins it). A face that exists only to be set in italic lives
 * here instead, so that contract stays simple and the loader stays in this
 * package (scripts/lint-font-pipeline.mjs).
 *
 * Fraunces Italic: the Latin subset of the variable `wght` build, SIL OFL 1.1,
 * from the same @fontsource-variable/fraunces release as the upright file. It
 * declares the family name `Fraunces`, so a `font-style: italic` run in a
 * Fraunces stack picks this file and an upright run picks the registry one.
 * preload:false like every registry face: it downloads only when an element
 * resolves to `--font-reg-fraunces-italic`.
 */

import localFont from "next/font/local";

export const frauncesItalic = localFont({
  src: [
    {
      path: "../generated/registry/fraunces-latin-wght-italic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  display: "swap",
  preload: false,
  declarations: [
    { prop: "font-family", value: "'Fraunces'" },
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  adjustFontFallback: "Times New Roman",
  variable: "--font-reg-fraunces-italic",
});

/** Space-joined `.variable` classNames for every display italic. */
export const fontDisplayClassName = frauncesItalic.variable;
