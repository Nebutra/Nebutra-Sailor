import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nebutra Auth",
  description: "Nebutra login center — shared authentication for all first-party apps",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Cookie mode: NEXT_LOCALE → getRequestConfig → getLocale()/getMessages().
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
