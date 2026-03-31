import type { Metadata, Viewport } from "next";
import {
  Dela_Gothic_One,
  Instrument_Sans,
  JetBrains_Mono,
  Playfair_Display,
} from "next/font/google";
import { getLocale } from "next-intl/server";
import "@/lib/env"; // validate required env vars at startup
import "./globals.css";

export const metadata: Metadata = {
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

/**
 * Font System: "Tseka Editorial Stack"
 *
 * Instrument Sans  — UI primary: geometric warmth, more character than Inter
 * Playfair Display — Editorial serif: hero / article title contrast tension
 * JetBrains Mono   — Code / terminal / data display
 * AlibabaPuHuiTi   — Chinese sans: local font, scoped via unicode-range
 * SourceHanSerifCN — Chinese serif: long-form reading, scoped via unicode-range
 */
const instrumentSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans-var",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono-var",
  display: "swap",
});

/*
 * Dela Gothic One — ultra-wide display black
 * SIL OFL, Google Fonts. Very popular 2024-2026 in tech/design community.
 * Use: large English/Japanese display headings, section callouts, decorative numbers
 */
const delaGothic = Dela_Gothic_One({
  subsets: ["latin", "japanese"],
  weight: "400",
  variable: "--font-dela-gothic",
  display: "swap",
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${instrumentSans.variable} ${playfair.variable} ${jetbrainsMono.variable} ${delaGothic.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="antialiased overflow-x-hidden text-gray-900 relative bg-[#fafafa] dark:bg-[#0a0a0a] dark:text-white">
        {children}
      </body>
    </html>
  );
}
