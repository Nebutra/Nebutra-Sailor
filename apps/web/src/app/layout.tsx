import { getConfiguredAuthProvider } from "@nebutra/auth";
import { AuthProvider } from "@nebutra/auth/react";
import { brand } from "@nebutra/brand/metadata";
import { getSiteMetadata } from "@nebutra/brand/metadata-helpers";
import { fontRegistryClassName } from "@nebutra/fonts/next";
import { cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { toHtmlLang, toTextDir } from "@nebutra/i18n/locales";
import { THEME_STORAGE_KEY } from "@nebutra/tokens";
import { DesignSystemProvider } from "@nebutra/ui/layout";
import { Toaster } from "@nebutra/ui/primitives";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PostHogProvider } from "@/components/PostHogProvider";
import { getNonce } from "@/lib/nonce";
import { QueryProvider } from "./providers";
import { ThemeShell } from "./providers/theme-provider";
import "./globals.css";

// GeistSans → --font-geist-sans (variable font, 100–900)
// GeistMono → --font-geist-mono (variable font, 100–900)
// Referenced in packages/design/ui/src/typography/fonts.css via var(--font-geist-sans/mono)
//
// cjkFontClassName → --font-noto-sans-sc: the self-hosted Noto Sans SC subset
// (next/font/local — files ship in @nebutra/fonts, so no build-time fetch). Geist
// has zero CJK coverage, so without it every Chinese character fell back to the
// OS face (PingFang / YaHei / whatever Android ships). ORDER: --font-sans lists
// Geist first and Noto Sans SC after it, so Geist keeps Latin and the numerals
// (tabular figures in dense tables) and only CJK falls through — and the subset
// carries no Latin glyphs at all, so that holds even if a stack is mis-ordered.
//
// Theme / DESIGN.md webfonts — the self-hosted OSS font registry (@nebutra/fonts)
// declares ~16 common faces via next/font (build-time self-host, ZERO runtime
// external requests). `fontRegistryClassName` defines their --font-* variables on
// <html>; the appearance layer prepends the matching var() when a theme or
// imported DESIGN.md font matches (see @nebutra/fonts withRegistryFont).

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  // Spread brand-derived base; override service-specific fields below.
  // metadataBase localhost fallback for local dev (no NEXT_PUBLIC_SITE_URL set).
  ...getSiteMetadata({ service: "app" }),
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: `${brand.name} - AI-native SaaS console`,
    template: `%s - ${brand.name}`,
  },
  description: `Public intelligence surface for ${brand.name}'s AI-native SaaS platform. Sign in to activate private workspaces, chat, analytics, billing, and administration.`,
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: `${brand.name} - AI-native SaaS console`,
    description: `Public intelligence surface for ${brand.name}'s AI-native SaaS platform with private services behind account access.`,
  },
  // Cookie-based i18n: no per-locale URLs exist, so no languages map.
  alternates: {
    canonical: "/",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Cookie mode: locale is resolved from the NEXT_LOCALE cookie by getRequestConfig.
  // getLocale() reads the value set by that config — no params.locale needed.
  const locale = await getLocale();
  const nonce = await getNonce();
  const messages = await getMessages();

  // Read the persisted theme from cookie so we can render <html> with the
  // correct class server-side. ThemeProvider writes this cookie whenever
  // the user changes themes (mirrors the localStorage state). On first
  // visit the cookie is absent — we render with no theme class and let
  // the client take over (brief flash only on "system" preference first
  // visit). This replaces the inline FOUC-prevention <script>, which
  // React 19 / Turbopack warn about for every page load.
  const themeCookie = (await cookies()).get(THEME_STORAGE_KEY)?.value;
  const themeClass = themeCookie === "dark" ? "dark" : themeCookie === "light" ? "light" : "";

  // Detect auth provider from environment
  const authProvider = getConfiguredAuthProvider();

  // Prepare provider config based on selected provider
  const authProviderConfig: Record<string, unknown> = {};
  if (authProvider === "clerk") {
    authProviderConfig.publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  } else if (authProvider === "supabase") {
    authProviderConfig.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    authProviderConfig.supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }

  return (
    <html
      lang={toHtmlLang(locale)}
      dir={toTextDir(locale)}
      className={`${themeClass} ${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName} ${fontRegistryClassName}`.trim()}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-[var(--radius-md)] bg-[hsl(var(--primary))] px-3 py-2 text-sm font-medium text-white opacity-0 transition focus:translate-y-0 focus:opacity-100"
        >
          Skip to content
        </a>

        <AuthProvider provider={authProvider} config={authProviderConfig}>
          <ThemeShell nonce={nonce}>
            <NextIntlClientProvider messages={messages}>
              <DesignSystemProvider>
                <QueryProvider>
                  <PostHogProvider>
                    <ErrorBoundary>{children}</ErrorBoundary>
                  </PostHogProvider>
                </QueryProvider>
              </DesignSystemProvider>
              {/* Global toast outlet — every app surface can call `toast.*` */}
              <Toaster />
            </NextIntlClientProvider>
          </ThemeShell>
        </AuthProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
