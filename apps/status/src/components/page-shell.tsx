import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { loadMessages } from "@/i18n/messages";
import { type AppLocale, htmlLang, pageLocales } from "@/lib/locale";
import { HtmlLang } from "./html-lang";
import { SubscribeMenu } from "./subscribe-menu";

/**
 * Frame of every public page, after incident.io: a 672px column, the page
 * name linking home on the left, Subscribe and the language switch on the
 * right, a centred "Powered by" footer. The language switch goes through
 * /lang/<locale>, which saves the choice and returns to this same path.
 */
export async function PageShell({
  locale,
  page,
  path,
  children,
}: {
  locale: AppLocale;
  page: { slug: string; title: string; locales: string[] } | null;
  /** This page's own path, so the language switch returns here. */
  path: string;
  children: ReactNode;
}) {
  const t = await getTranslations({ locale });
  const messages = await loadMessages(locale);
  const languages = page ? pageLocales(page.locales) : (["zh-CN", "en"] as AppLocale[]);
  const other = languages.find((l) => l !== locale);
  const home = page ? `/p/${page.slug}` : "/";

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <HtmlLang lang={htmlLang(locale)} />
      <div
        lang={htmlLang(locale)}
        className="flex min-h-dvh flex-col bg-background text-foreground"
      >
        <header className="px-4">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 pb-6 pt-8">
            <a
              href={home}
              aria-label={`${page?.title ?? "Nebutra Status"} · ${t("header.home")}`}
              className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground"
            >
              {page?.title ?? "Nebutra Status"}
            </a>
            <nav className="flex shrink-0 items-center gap-2">
              {other ? (
                <a
                  href={`/lang/${other}?next=${encodeURIComponent(path)}`}
                  hrefLang={htmlLang(other)}
                  lang={htmlLang(other)}
                  aria-label={t("header.languageLabel")}
                  className="rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("header.language")}
                </a>
              ) : null}
              {page ? (
                <SubscribeMenu
                  label={t("header.subscribe")}
                  slug={page.slug}
                  atom={t("footer.atom")}
                  rss={t("footer.rss")}
                />
              ) : null}
            </nav>
          </div>
        </header>
        <main id="main-content" className="flex-1 px-4 pb-16">
          <div className="mx-auto w-full max-w-2xl">{children}</div>
        </main>
        <footer className="px-4 pb-10">
          <p className="mx-auto max-w-2xl text-center text-sm text-muted-foreground">
            {t("footer.powered", { product: "Nebutra Status" })}
          </p>
        </footer>
      </div>
    </NextIntlClientProvider>
  );
}
