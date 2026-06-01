import { fontRegistryClassName } from "@nebutra/fonts/next";
import type { Metadata, Viewport } from "next";
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
 * Instrument Sans  — UI primary fallback target
 * Playfair Display — Editorial serif fallback target
 * JetBrains Mono   — Code / terminal / data display fallback target
 * AlibabaPuHuiTi   — Chinese sans: local font, scoped via unicode-range
 * SourceHanSerifCN — Chinese serif: long-form reading, scoped via unicode-range
 *
 * Latin display fonts are resolved through CSS fallback stacks so production
 * builds do not depend on live Google Fonts fetches.
 */

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`scroll-smooth ${fontRegistryClassName}`.trim()}
      suppressHydrationWarning
    >
      <body className="antialiased overflow-x-hidden text-gray-900 relative bg-[#fafafa] dark:bg-[#0a0a0a] dark:text-white">
        {children}
      </body>
    </html>
  );
}
