import "./globals.css";
import { getConfiguredAuthProvider } from "@nebutra/auth";
import { AuthProvider } from "@nebutra/auth/react";
import { brand } from "@nebutra/brand/metadata";
import { toHtmlLang, toTextDir } from "@nebutra/i18n/locales";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: {
      default: t("titleDefault", { brandName: brand.name }),
      template: t("titleTemplate", { brandName: brand.name }),
    },
    description: t("description"),
    icons: {
      icon: [
        { url: "/favicon.png", type: "image/png", sizes: "32x32" },
        { url: "/product/forge-favicon.png", type: "image/png", sizes: "256x256" },
        { url: "/favicon.ico", sizes: "48x48" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

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

  return (
    <html
      lang={toHtmlLang(locale)}
      dir={toTextDir(locale)}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-[var(--neutral-1)] font-sans text-[var(--neutral-12)] antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider provider={authProvider} config={authProviderConfig}>
            <SiteHeader />
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
