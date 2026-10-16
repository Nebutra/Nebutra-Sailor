import { Calendar } from "@nebutra/icons";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { loadMessages } from "@/i18n/messages";
import { type AppLocale, htmlLang, pageLocales } from "@/lib/locale";
import { HtmlLang } from "./html-lang";

const LOCALE_NAMES: Record<AppLocale, string> = { "zh-CN": "中文", en: "English" };

/**
 * The frame of every public page: the page's name, its content column, and a
 * quiet footer with feeds and the language switch. No marketing chrome — a
 * status page is a trust surface.
 */
export async function PageShell({
  locale,
  page,
  path,
  children,
}: {
  locale: AppLocale;
  page: { slug: string; title: string; locales: string[] } | null;
  /** This page's path, for language links. */
  path: string;
  children: ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const th = await getTranslations({ locale, namespace: "history" });
  const messages = await loadMessages(locale);
  const languages = page ? pageLocales(page.locales) : (["zh-CN", "en"] as AppLocale[]);
  const home = page ? `/p/${page.slug}` : "/";

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <HtmlLang lang={htmlLang(locale)} />
      <div
        lang={htmlLang(locale)}
        className="flex min-h-dvh flex-col bg-background text-foreground"
      >
        <header className="px-4 sm:px-6">
          <div className="mx-auto flex h-16 w-full max-w-text items-center justify-between gap-4">
            <a
              href={home}
              className="truncate text-base font-semibold tracking-tight text-foreground"
            >
              {page?.title ?? "Nebutra Status"}
            </a>
            {page ? (
              <a
                href={`/p/${page.slug}/history`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Calendar aria-hidden className="size-4" />
                {th("viewHistory")}
              </a>
            ) : null}
          </div>
        </header>
        <main id="main-content" className="flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
          <div className="mx-auto w-full max-w-text">{children}</div>
        </main>
        <footer className="border-t border-border px-4 py-8 sm:px-6">
          <div className="mx-auto flex w-full max-w-text flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            {page ? (
              <nav
                aria-label={t("subscribe")}
                className="flex flex-wrap items-center gap-x-4 gap-y-2"
              >
                <span className="text-foreground">{t("subscribe")}</span>
                <a className="hover:text-foreground" href={`/api/v1/pages/${page.slug}/feed.atom`}>
                  {t("atom")}
                </a>
                <a className="hover:text-foreground" href={`/api/v1/pages/${page.slug}/feed.rss`}>
                  {t("rss")}
                </a>
              </nav>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {languages.length > 1 ? (
                <nav aria-label={t("language")} className="flex items-center gap-3">
                  {languages.map((l) => (
                    <a
                      key={l}
                      href={`${path}?lang=${l}`}
                      hrefLang={htmlLang(l)}
                      lang={htmlLang(l)}
                      aria-current={l === locale ? "true" : undefined}
                      className={
                        l === locale ? "text-foreground" : "transition-colors hover:text-foreground"
                      }
                    >
                      {LOCALE_NAMES[l]}
                    </a>
                  ))}
                </nav>
              ) : null}
              <span className="text-xs">{t("powered", { product: "Nebutra Status" })}</span>
            </div>
          </div>
        </footer>
      </div>
    </NextIntlClientProvider>
  );
}
