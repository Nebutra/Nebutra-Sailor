import "@/styles/globals.css";
import { THEME_STORAGE_KEY, ThemeProvider } from "@nebutra/tokens";
import { FontFaces, fontClassName } from "@nebutra/tokens/fonts";
import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";
import { htmlLang, resolveLocale } from "@/lib/locale";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-boot";

export const metadata: Metadata = {
  title: { default: "Nebutra Status", template: "%s" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

/**
 * Root frame. Each page sets its own language from the page's locales; this
 * layout only guesses from the browser so <html lang> is close before paint.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const [h, jar] = await Promise.all([headers(), cookies()]);
  const lang = htmlLang(
    resolveLocale({ acceptLanguage: h.get("accept-language"), locales: ["en", "zh-CN"] }),
  );
  const stored = jar.get(THEME_STORAGE_KEY)?.value;
  const themeClass = stored === "dark" || stored === "light" ? stored : "";
  return (
    <html lang={lang} className={`${themeClass} ${fontClassName}`.trim()} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <FontFaces />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
