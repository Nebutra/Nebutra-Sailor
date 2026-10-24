import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { HtmlLang } from "@/components/html-lang";
import { loadMessages } from "@/i18n/messages";
import { adminLocale } from "@/lib/admin";
import { htmlLang } from "@/lib/locale";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nebutra Status admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const locale = await adminLocale();
  return (
    <NextIntlClientProvider locale={locale} messages={await loadMessages(locale)} timeZone="UTC">
      <HtmlLang lang={htmlLang(locale)} />
      <div lang={htmlLang(locale)}>{children}</div>
    </NextIntlClientProvider>
  );
}
