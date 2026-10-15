/**
 * @nebutra/tokens/fonts — THE font loader for every Next app (server-only).
 *
 * One import, two things to render, nothing else:
 *
 *   import { FontFaces, fontClassName } from "@nebutra/tokens/fonts";
 *
 *   <html className={fontClassName}>
 *     <body>
 *       <FontFaces />            // MiSans @font-face (CDN, CJK-only range)
 *
 * WHY ONE MODULE. Until 2026-10-16 every app composed its own loader string
 * from three packages (`geist/font/sans`, `geist/font/mono`,
 * `@nebutra/fonts/next/cjk`). auth and idp forgot two of the three, so the
 * token stacks that open with `var(--font-geist-sans)` were void there and
 * the auth center rendered in ui-sans-serif, the IdP in Times. The
 * token stacks now carry family fallbacks too, but the loader is the part that
 * makes the face actually download — so it lives here, once, and
 * scripts/lint-font-pipeline.mjs fails any `next/font`, `geist/font` or
 * `@nebutra/fonts/next*` import outside packages/design/{tokens,fonts}.
 *
 * What the class defines (all self-hosted, no build-time network):
 *   --font-geist-sans  Geist, variable 100–900      body / UI, Latin + numerals
 *                      (split by script: the Latin file is preloaded, the rest
 *                      loads only for a character outside it — @nebutra/fonts/next/geist)
 *   --font-geist-mono  Geist Mono, variable 100–900 code (not preloaded)
 *   --font-dm-sans     DM Sans, variable, Latin     headings (weight from core.json)
 * MiSans (CJK) cannot ship in this public repo (licence), so <FontFaces />
 * declares it from the deployment's asset CDN at request time.
 *
 * Design-language faces (Inter, Fraunces, …) are NOT here: a language's fonts
 * load only while that language is active. Apps that switch languages add
 * `fontRegistryClassName` from `@nebutra/tokens/fonts/registry`, whose faces
 * are declared with preload:false and download only when a stack uses them.
 *
 * next/font is a compile-time transform; this file is shipped as source and
 * compiled by the consuming app (transpilePackages: ["@nebutra/tokens"]).
 */

import { brandFontClassName, CjkFontFace } from "@nebutra/fonts/next/cjk";
import { geistMono, geistSansClassName } from "@nebutra/fonts/next/geist";

export { misansFontFaceCss } from "@nebutra/fonts/next/cjk";

/**
 * Put on <html>. Defines every core font variable the token stacks read.
 * Compose with other classes as `${fontClassName} ${themeClass}`.
 */
export const fontClassName = `${geistSansClassName} ${geistMono.variable} ${brandFontClassName}`;

export interface FontFacesProps {
  /** CSP nonce, for apps whose style-src allows inline styles only by nonce. */
  nonce?: string | undefined;
  /** Asset origin override; defaults to publicAssetUrl() resolution. */
  origin?: string | undefined;
}

/**
 * Render once inside <body> of every root layout. React 19 hoists the
 * `<style href precedence>` into <head> and dedupes it, so a second render
 * (a nested layout that also renders it) costs nothing.
 */
export function FontFaces({ nonce, origin }: FontFacesProps) {
  return <CjkFontFace {...(nonce ? { nonce } : {})} {...(origin ? { origin } : {})} />;
}
