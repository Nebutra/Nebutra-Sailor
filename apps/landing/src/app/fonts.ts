import { fontRegistryClassName } from "@nebutra/fonts/next";
import { cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

// GeistSans → --font-geist-sans | GeistMono → --font-geist-mono
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
 * Combined font CSS-variable classes applied to <html>. Shared by the two
 * root-layout owners — `app/[lang]/layout.tsx` (localized routes) and
 * `app/not-found.tsx` (the global, non-localized 404) — so both render the
 * same typography shell.
 */
export const fontVariables = `${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName} ${fontRegistryClassName}`;
