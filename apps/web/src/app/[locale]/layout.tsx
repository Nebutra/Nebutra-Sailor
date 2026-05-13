import { getConfiguredAuthProvider } from "@nebutra/auth";
import { AuthProvider } from "@nebutra/auth/react";
import { buildThemeInitScript } from "@nebutra/tokens";
import { DesignSystemProvider } from "@nebutra/ui/layout";
import { Toaster } from "@nebutra/ui/primitives";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
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

  // Detect auth provider from environment
  const authProvider = getConfiguredAuthProvider();

  // Prepare provider config based on selected provider
  const authProviderConfig: Record<string, unknown> = {};
  if (authProvider === "clerk") {
    authProviderConfig.publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  }

  return (
    <html
      lang={locale}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        {/* FOUC-prevention: Next.js next/script `beforeInteractive`
            strategy injects the inline script into the HTML response
            itself, bypassing React's render pipeline — which is what
            makes the React 19 "scripts inside React components" warning
            actually go away (it fires for any <script> JSX, Server or
            Client). Runs synchronously before hydration. */}
        <Script id="theme-init" strategy="beforeInteractive" nonce={nonce}>
          {buildThemeInitScript()}
        </Script>
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
