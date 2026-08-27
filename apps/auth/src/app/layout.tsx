import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { brand } from "@nebutra/brand/metadata";
import { toHtmlLang, toTextDir } from "@nebutra/i18n/locales";

export const metadata: Metadata = {
  title: `${brand.name} Auth`,
  description: `${brand.name} login center — shared authentication for all first-party apps`,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Cookie mode: NEXT_LOCALE → getRequestConfig → getLocale()/getMessages().
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={toHtmlLang(locale)} dir={toTextDir(locale)}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
