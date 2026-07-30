import { cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Inter, JetBrains_Mono, Playfair_Display, Space_Grotesk } from "next/font/google";

// GeistSans → --font-geist-sans | GeistMono → --font-geist-mono
// cjkFontClassName → --font-vivo-sans-sc (self-hosted vivo Sans SC subset,
// next/font/local, so no build-time fetch and no sandboxed-dev-server failure).
// Geist stays FIRST in --font-sans so it keeps Latin and the numerals; only CJK
// falls through to vivo Sans SC, whose subset contains no Latin glyphs at all.
// Weights 400/500/600 are real files — see @nebutra/fonts/next/cjk.
//
// Theme-preset webfonts — loaded once so that non-default themes (gradient,
// design languages via @nebutra/theme (data-brand)
// render in their declared typeface instead of falling back to system fonts.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  display: "swap",
});

/**
 * Combined font CSS-variable classes applied to <html>. Shared by the two
 * root-layout owners — `app/[lang]/layout.tsx` (localized routes) and
 * `app/not-found.tsx` (the global, non-localized 404) — so both render the
 * same typography shell.
 */
export const fontVariables = `${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName} ${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} ${playfairDisplay.variable}`;
