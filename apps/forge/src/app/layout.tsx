import "./globals.css";
import {
  buildAuthCenterSignInUrl,
  buildAuthCenterSignUpUrl,
  getConfiguredAuthProvider,
} from "@nebutra/auth";
import { AuthProvider } from "@nebutra/auth/react";
import { brand } from "@nebutra/brand/metadata";
import { toHtmlLang, toTextDir } from "@nebutra/i18n/locales";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// Full SSR: avoids Next 16 static export flakiness (workStore on _not-found / global-error).
// CDN (CF) can still cache HTML at the edge for public tool pages if desired.
export const dynamic = "force-dynamic";

/**
 * Static root metadata only — do NOT call next-intl/cookies here.
 * Next 16 prerenders `/_global-error` without workStore; async generateMetadata
 * that touches request APIs throws InvariantError and fails the whole build.
 * Locale-specific titles live on route segments (home / tool pages).
 */
export const metadata: Metadata = {
  title: {
    default: `${brand.name} Forge — Online tool station`,
    template: `%s | ${brand.name} Forge`,
  },
  description: "Codecs, text, hashing, documents, and image tools online.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/product/forge-favicon.png", type: "image/png", sizes: "256x256" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const authProvider = getConfiguredAuthProvider();
  const authProviderConfig: Record<string, unknown> = {};
  if (authProvider === "clerk") {
    authProviderConfig.publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  } else if (authProvider === "better-auth") {
    authProviderConfig.apiUrl =
      process.env.NEXT_PUBLIC_AUTH_URL?.trim() ||
      process.env.BETTER_AUTH_URL?.trim() ||
      process.env.NEXT_PUBLIC_AUTH_API_URL?.trim();
  }

  const locale = await getLocale();
  const messages = await getMessages();

  // Server-side auth URLs (process.env is available here even when the client
  // bundle was built without NEXT_PUBLIC_AUTH_URL). Prefer production forge
  // returnTo default so deep links work before client hydrates.
  const defaultReturnTo =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_FORGE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://forge.nebutra.com";
  const signInHref = buildAuthCenterSignInUrl(defaultReturnTo);
  const signUpHref = buildAuthCenterSignUpUrl(defaultReturnTo);

  return (
    <html
      lang={toHtmlLang(locale)}
      dir={toTextDir(locale)}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-[var(--neutral-1)] font-sans text-[var(--neutral-12)] antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider provider={authProvider} config={authProviderConfig}>
            <SiteHeader signInHref={signInHref} signUpHref={signUpHref} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
