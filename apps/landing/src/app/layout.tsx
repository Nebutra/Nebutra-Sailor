import { brand } from "@nebutra/brand/metadata";
import type { Metadata } from "next";
import { seoContent } from "@/lib/landing-content";
import "./globals.css";

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
 * Passthrough root layout — it deliberately renders NO <html>/<body>.
 *
 * The HTML shell is owned by whichever layout *knows the locale*, so that
 * <html lang> is server-rendered correctly per language (not a hardcoded
 * "en" or a client-side patch):
 *   - localized routes  → app/[lang]/layout.tsx renders <html lang={locale}>
 *     (locale comes from static params, so it stays PPR/cacheComponents-safe)
 *   - the global 404     → app/not-found.tsx renders its own <html lang="en">
 *
 * This file still owns the truly global, locale-independent concerns: the
 * stylesheet (globals.css) and the default <metadata>. It must NOT read any
 * request-scoped data (headers/cookies) — that would make every static
 * marketing route dynamic and break Cache Components (PPR).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
