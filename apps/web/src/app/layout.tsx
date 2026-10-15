import { getConfiguredAuthProvider } from "@nebutra/auth";
import { AuthProvider } from "@nebutra/auth/react";
import { brand } from "@nebutra/brand/metadata";
import { getSiteMetadata } from "@nebutra/brand/metadata-helpers";
import { toHtmlLang, toTextDir } from "@nebutra/i18n/locales";
import { THEME_STORAGE_KEY } from "@nebutra/tokens";
import { FontFaces, fontClassName } from "@nebutra/tokens/fonts";
import { fontRegistryClassName } from "@nebutra/tokens/fonts/registry";
import { DesignSystemProvider } from "@nebutra/ui/layout";
import { Toaster } from "@nebutra/ui/primitives";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PostHogProvider } from "@/components/PostHogProvider";
import { getNonce } from "@/lib/nonce";
import { QueryProvider } from "./providers";
import { ThemeShell } from "./providers/theme-provider";
import "./globals.css";
import { loadUiLabels } from "@nebutra/i18n/ui-labels";
import { UiLabelsProvider } from "@nebutra/ui/primitives";

// Fonts: `fontClassName` + <FontFaces /> from @nebutra/tokens/fonts — the one
// loader every app uses (Geist, Geist Mono, DM Sans headings, MiSans for CJK).
// `fontRegistryClassName` adds the design-language faces; each downloads only
// while a theme or imported DESIGN.md stack resolves to it.

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale / userScalable: pinch-zoom must stay available (WCAG
  // 1.4.4). iOS focus-zoom is avoided by ≥16px input text on touch instead.
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
  const tc = await getTranslations("copy.webLayout");
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

  // Better Auth reads its own env directly; the dev provider takes no config.
  const authProviderConfig: Record<string, unknown> = {};

  return (
    <html
      lang={toHtmlLang(locale)}
      dir={toTextDir(locale)}
      className={`${themeClass} ${fontClassName} ${fontRegistryClassName}`.trim()}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <FontFaces nonce={nonce} />

        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[var(--layer-skip-link)] -translate-y-20 rounded-[var(--radius-md)] bg-primary px-3 py-2 text-sm font-medium text-primary-foreground opacity-0 transition focus:translate-y-0 focus:opacity-100"
        >
          {tc("skipToContent")}
        </a>

        <AuthProvider provider={authProvider} config={authProviderConfig}>
          <ThemeShell nonce={nonce}>
            <NextIntlClientProvider messages={messages}>
              <UiLabelsProvider labels={await loadUiLabels(locale)}>
                <DesignSystemProvider>
                  <QueryProvider>
                    <PostHogProvider>
                      <ErrorBoundary>{children}</ErrorBoundary>
                    </PostHogProvider>
                  </QueryProvider>
                </DesignSystemProvider>
                {/* Global toast outlet — every app surface can call `toast.*` */}
                <Toaster />
              </UiLabelsProvider>
            </NextIntlClientProvider>
          </ThemeShell>
        </AuthProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
