import "./globals.css";
// Server layout: root entry is fine (config + createAuth never hit the client graph here).
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
import { Suspense } from "react";
import { ConsoleShell } from "@/components/console-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: {
      default: t("titleDefault", { brandName: brand.name }),
      template: t("titleTemplate", { brandName: brand.name }),
    },
    description: t("description"),
    // Product sub-brand favicon — transparent PNG redstone repeater (not parent brand SVG).
    icons: {
      icon: [
        { url: "/favicon.png", type: "image/png", sizes: "32x32" },
        { url: "/product/router-favicon.png", type: "image/png", sizes: "256x256" },
        { url: "/favicon.ico", sizes: "48x48" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

/**
 * Shell + @nebutra/auth (default better-auth via Auth Center).
 * Locale: cookie NEXT_LOCALE → PRODUCT_LANGUAGES wheel (@nebutra/i18n).
 */
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
  } else if (authProvider === "supabase") {
    authProviderConfig.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    authProviderConfig.supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={toHtmlLang(locale)}
      dir={toTextDir(locale)}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider provider={authProvider} config={authProviderConfig}>
            <Suspense fallback={<div className="min-h-screen bg-[var(--neutral-1)]" />}>
              <ConsoleShell>{children}</ConsoleShell>
            </Suspense>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
