import "@/styles/globals.css";
import { THEME_STORAGE_KEY, ThemeProvider } from "@nebutra/tokens";
import { fontClassName } from "@nebutra/tokens/fonts";
import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";
import { TimeZoneCookie } from "@/components/time-zone-cookie";
import { defaultPageLocales } from "@/lib/data";
import { htmlLang, LOCALE_COOKIE, resolveLocale } from "@/lib/locale";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-boot";
import { TIME_ZONE_COOKIE, validTimeZone } from "@/lib/time-zone";

export const metadata: Metadata = {
  title: { default: "Nebutra Status", template: "%s" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e10" },
  ],
};

/**
 * Root frame. `<html lang>` is decided here from the same inputs the pages
 * use — saved choice, then browser against the default page's languages — so
 * it is right in the server HTML. Fonts are self-hosted (Geist via next/font);
 * Chinese falls back to the system face, so a self-hosted instance never
 * calls out to a Nebutra CDN.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const [h, jar] = await Promise.all([headers(), cookies()]);
  const lang = htmlLang(
    resolveLocale({
      cookie: jar.get(LOCALE_COOKIE)?.value,
      acceptLanguage: h.get("accept-language"),
      locales: await defaultPageLocales(),
    }),
  );
  const stored = jar.get(THEME_STORAGE_KEY)?.value;
  const themeClass = stored === "dark" || stored === "light" ? stored : "";
  return (
    <html lang={lang} className={`${themeClass} ${fontClassName}`.trim()} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <TimeZoneCookie current={validTimeZone(jar.get(TIME_ZONE_COOKIE)?.value)} />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
