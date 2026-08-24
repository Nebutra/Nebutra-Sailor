import "./globals.css";
import {
  buildAuthCenterSignInUrl,
  buildAuthCenterSignUpUrl,
  getConfiguredAuthProvider,
} from "@nebutra/auth";
import { AuthProvider } from "@nebutra/auth/react";
import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { toHtmlLang, toTextDir } from "@nebutra/i18n/locales";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getForgeOrigin, getForgeVerification } from "@/lib/seo";

// Full SSR: avoids Next 16 static export flakiness (workStore on _not-found / global-error).
// CDN (CF) can still cache HTML at the edge for public tool pages if desired.
export const dynamic = "force-dynamic";

/**
 * Static root metadata only — do NOT call next-intl/cookies here.
 * Next 16 prerenders `/_global-error` without workStore; async generateMetadata
 * that touches request APIs throws InvariantError and fails the whole build.
 * Locale-specific titles live on route segments (home / tool pages).
 */
const forgeTitle = `${brand.name} Forge — Online tool station`;
const forgeDescription = "Codecs, text, hashing, documents, and image tools online.";

export const metadata: Metadata = {
  metadataBase: new URL(getForgeOrigin()),
  applicationName: `${brand.name} Forge`,
  title: {
    default: forgeTitle,
    template: `%s | ${brand.name} Forge`,
  },
  description: forgeDescription,
  authors: [{ name: brand.name, url: getBrandOrigin("landing") }],
  creator: brand.name,
  publisher: brand.name,
  alternates: {
    canonical: "/",
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
  verification: getForgeVerification(),
  openGraph: {
    type: "website",
    siteName: `${brand.name} Forge`,
    title: forgeTitle,
    description: forgeDescription,
    url: "/",
    images: [{ url: "/product/forge-anvil.png", alt: `${brand.name} Forge` }],
  },
  twitter: {
    card: "summary",
    title: forgeTitle,
    description: forgeDescription,
    images: ["/product/forge-anvil.png"],
  },
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
    // brand.domains.forge rather than a literal host: this is the last-resort
    // fallback, so on a white-label build it is the one value that would still
    // point at the upstream vendor after every env var had been replaced.
    getBrandOrigin("forge");
  const signInHref = buildAuthCenterSignInUrl(defaultReturnTo);
  const signUpHref = buildAuthCenterSignUpUrl(defaultReturnTo);

  return (
    <html
      lang={toHtmlLang(locale)}
      dir={toTextDir(locale)}
      className={`${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName}`}
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
