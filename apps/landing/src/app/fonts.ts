import { fontRegistryClassName } from "@nebutra/fonts/next";
import { cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { geistSansClassName } from "@nebutra/fonts/next/geist";
import localFont from "next/font/local";

// Geist Sans → --font-geist-sans, from @nebutra/fonts/next/geist: the same face as
// geist/font/sans split into a preloaded Latin file (32 KB) and the rest (not
// preloaded, fetched only for a character outside Latin), instead of one 69 KB
// preload on every page. GeistMono → --font-geist-mono.
// cjkFontClassName → --font-dm-sans, the heading face (next/font/local, so no
// build-time fetch and no sandboxed-dev-server failure). MiSans comes from
// <CjkFontFace /> in the root layout, served by the asset CDN. Geist stays FIRST
// in --font-sans so it keeps Latin and the numerals; only CJK falls through to
// MiSans, whose unicode-range contains no Latin at all.
//
// Design-language webfonts — the registry in @nebutra/fonts/next, self-hosted at
// build time. Declaring the whole set is cheap: a file is only fetched when an
// element actually resolves to that variable, and skins.css names them via
// var(--font-*), which is the ONLY way to reach next/font's hashed families.
// Hand-declaring a subset here is what left four of the eight design languages
// pointing at variables no app defined.
/**
 * Geist Mono, declared here rather than imported from `geist/font/mono` only to
 * turn its preload off. The package's loader preloads the 72 KB variable file on
 * every page, and no landing page sets mono text above the fold (code blocks,
 * Studio readouts), so the preload competed with the LCP text for the first
 * bytes and was then unused. Same file, variable and fallback stack as the
 * package's own declaration; the face still loads the moment text uses it.
 */
const GeistMono = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  adjustFontFallback: false,
  preload: false,
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
  weight: "100 900",
});

/**
 * Combined font CSS-variable classes applied to <html>. Shared by the two
 * root-layout owners — `app/[lang]/layout.tsx` (localized routes) and
 * `app/not-found.tsx` (the global, non-localized 404) — so both render the
 * same typography shell.
 */
export const fontVariables = `${geistSansClassName} ${GeistMono.variable} ${cjkFontClassName} ${fontRegistryClassName}`;
