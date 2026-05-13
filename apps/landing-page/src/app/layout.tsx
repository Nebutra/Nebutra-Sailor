import { THEME_STORAGE_KEY } from "@nebutra/tokens";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { seoContent } from "@/lib/landing-content";
import "./globals.css";

// GeistSans → --font-geist-sans | GeistMono → --font-geist-mono
// CJK fallback is provided by @nebutra/tokens --font-cn to avoid build-time font fetches.

/**
 * Root layout metadata — locale-independent defaults only.
 * Locale-dependent title/description/OG are handled by [lang]/layout.tsx generateMetadata.
 */
export const metadata: Metadata = {
  keywords: [...seoContent.keywords],
  authors: [{ name: "Nebutra" }],
  creator: "Nebutra",
  publisher: "Nebutra Intelligence",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://nebutra.com"),
  alternates: {
    canonical: "/",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? undefined,
  },
  openGraph: {
    type: "website",
    url: "https://nebutra.com",
    siteName: "Nebutra Sailor",
    images: [
      {
        url: seoContent.ogImage,
        width: 1200,
        height: 630,
        alt: "Nebutra Sailor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: seoContent.twitterHandle,
    images: [seoContent.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

/**
 * Root layout is a passthrough — the HTML shell lives in [lang]/layout.tsx
 * so that the locale is available from static params (required for cacheComponents).
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the persisted theme from cookie so <html> gets the correct class
  // server-side — zero inline script, zero React 19 / Turbopack warning,
  // zero FOUC risk for users who have already picked light/dark. ThemeProvider
  // writes this cookie whenever theme changes.
  const themeCookie = (await cookies()).get(THEME_STORAGE_KEY)?.value;
  const themeClass = themeCookie === "dark" ? "dark" : themeCookie === "light" ? "light" : "";

  return (
    <html
      lang="en"
      className={`${themeClass} ${GeistSans.variable} ${GeistMono.variable} min-h-screen antialiased`.trim()}
      suppressHydrationWarning
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
