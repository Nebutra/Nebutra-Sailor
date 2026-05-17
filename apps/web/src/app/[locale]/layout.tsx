import { getConfiguredAuthProvider } from "@nebutra/auth";
import { AuthProvider } from "@nebutra/auth/react";
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
import { getMessages } from "next-intl/server";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PostHogProvider } from "@/components/PostHogProvider";
import { getNonce } from "@/lib/nonce";
import { QueryProvider } from "./providers";
import { ThemeShell } from "./providers/theme-provider";
import "../globals.css";

// GeistSans → --font-geist-sans (variable font, 100–900)
// GeistMono → --font-geist-mono (variable font, 100–900)
// Referenced in packages/design/ui/src/typography/fonts.css via var(--font-geist-sans/mono)
// CJK fallback is provided by @nebutra/tokens and @nebutra/ui without Google font fetches.

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Nebutra - SaaS Platform",
  description: "Enterprise-grade AI-native SaaS platform",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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
    authProviderConfig.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }

  return (
    <html
      lang={locale}
      className={`${themeClass} ${GeistSans.variable} ${GeistMono.variable}`.trim()}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-[var(--radius-md)] bg-[var(--blue-9)] px-3 py-2 text-sm font-medium text-white opacity-0 transition focus:translate-y-0 focus:opacity-100"
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
