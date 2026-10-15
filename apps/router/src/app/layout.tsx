import { FontFaces, fontClassName } from "@nebutra/tokens/fonts";
import "./globals.css";
// Server layout: root entry is fine (config + createAuth never hit the client graph here).
import { getConfiguredAuthProvider } from "@nebutra/auth";
import { AuthProvider } from "@nebutra/auth/react";
import { brand } from "@nebutra/brand/metadata";
import { toHtmlLang, toTextDir } from "@nebutra/i18n/locales";
import { loadUiLabels } from "@nebutra/i18n/ui-labels";
import { THEME_STORAGE_KEY, ThemeProvider } from "@nebutra/tokens";
import { UiLabelsProvider } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { ConsoleShell, SIDEBAR_COOKIE } from "@/components/console-shell";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-boot";

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
 * Locale: cookie NEXT_LOCALE → canonical BCP-47 wheel (@nebutra/i18n).
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const authProvider = getConfiguredAuthProvider();
  const authProviderConfig: Record<string, unknown> = {};
  if (authProvider === "better-auth") {
    authProviderConfig.apiUrl =
      process.env.NEXT_PUBLIC_AUTH_URL?.trim() ||
      process.env.BETTER_AUTH_URL?.trim() ||
      process.env.NEXT_PUBLIC_AUTH_API_URL?.trim();
  }

  const locale = await getLocale();
  const messages = await getMessages();
  // The admin sidebar's width is on the request, so it renders collapsed on the
  // server rather than expanding and snapping shut after hydration.
  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";
  // ThemeProvider mirrors the resolved theme into this cookie, so a returning
  // visitor's <html> is rendered in the right mode; THEME_BOOT_SCRIPT covers a
  // first visit (no cookie yet) before paint.
  const themeCookie = cookieStore.get(THEME_STORAGE_KEY)?.value;
  const themeClass = themeCookie === "dark" || themeCookie === "light" ? themeCookie : "";

  return (
    <html
      lang={toHtmlLang(locale)}
      dir={toTextDir(locale)}
      className={`${themeClass} ${fontClassName}`.trim()}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        <FontFaces />

        <NextIntlClientProvider locale={locale} messages={messages}>
          <UiLabelsProvider labels={await loadUiLabels(locale)}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <AuthProvider provider={authProvider} config={authProviderConfig}>
                <Suspense fallback={<div className="min-h-screen bg-neutral-1" />}>
                  <ConsoleShell sidebarCollapsed={sidebarCollapsed}>{children}</ConsoleShell>
                </Suspense>
              </AuthProvider>
            </ThemeProvider>
          </UiLabelsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
