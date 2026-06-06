import { brand } from "@nebutra/brand/metadata";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display, Space_Grotesk } from "next/font/google";
import { seoContent } from "@/lib/landing-content";
import "./globals.css";

// GeistSans → --font-geist-sans | GeistMono → --font-geist-mono
// CJK fallback is provided by @nebutra/tokens --font-cn to avoid build-time font fetches.
//
// Theme-preset webfonts — loaded once so that non-default themes (gradient,
// dark-dense, minimal, vibrant, ocean) defined in @nebutra/theme/themes.css
// render in their declared typeface instead of falling back to system fonts.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
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
 * Root layout metadata — locale-independent defaults only.
 * Locale-dependent title/description/OG are handled by [lang]/layout.tsx generateMetadata.
 */
export const metadata: Metadata = {
  keywords: [...seoContent.keywords],
  authors: [{ name: brand.name }],
  creator: brand.name,
  publisher: brand.name,
  // metadataBase localhost fallback allows relative-URL OG images to resolve in dev
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? `https://${brand.domains.landing}`),
  alternates: {
    canonical: "/",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? undefined,
  },
  openGraph: {
    type: "website",
    url: `https://${brand.domains.landing}`,
    siteName: `${brand.name} Sailor`,
    images: [
      {
        url: seoContent.ogImage,
        width: 1200,
        height: 630,
        alt: `${brand.name} Sailor`,
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
// NOTE: landing-page does NOT inject the theme class server-side from the
// `theme` request header (the way apps/web does via next/headers). Reading
// any request-scoped data here would make the root layout dynamic, which
// breaks Next.js 16 Cache Components (PPR) for every static marketing route
// — confirmed regression that failed prerendered routes (changelog, legal,
// blog, etc.).
//
// Trade-off: users who have picked light/dark see a brief (~50ms) flash
// on first paint while the client-side ThemeProvider in <Providers> takes
// over and applies their saved preference. For a static marketing site
// this is the canonical compromise — Vercel.com itself does the same.
// The authenticated dashboard (apps/web) is dynamic anyway, so it keeps
// the header-based SSR injection without paying any PPR cost.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} ${playfairDisplay.variable} min-h-screen antialiased`}
      suppressHydrationWarning
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
