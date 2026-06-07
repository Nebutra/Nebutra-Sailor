import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Inter, JetBrains_Mono, Playfair_Display, Space_Grotesk } from "next/font/google";

// GeistSans → --font-geist-sans | GeistMono → --font-geist-mono
// CJK fallback is provided by @nebutra/tokens --font-cn to avoid build-time font fetches.
//
// Theme-preset webfonts — loaded once so that non-default themes (gradient,
// dark-dense, minimal, vibrant, ocean) defined in @nebutra/theme/themes.css
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
export const fontVariables = `${GeistSans.variable} ${GeistMono.variable} ${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} ${playfairDisplay.variable}`;
