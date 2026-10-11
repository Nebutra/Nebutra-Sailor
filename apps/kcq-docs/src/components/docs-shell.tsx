import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import fonts from "@/generated/fonts.json";
import themeInit from "@/generated/theme-init.json";
import { docsPath, type Lang, LOCALES, publicPath, UI } from "@/lib/i18n";
import { source } from "@/lib/source";
import { BrandMark } from "./brand-mark";
import { HeaderLinks } from "./header-links";
import { LazySearchDialog } from "./search-dialog-lazy";
import { ThemeToggle } from "./theme-toggle";

/**
 * The document shell for one language: <html> with the right lang, the fonts and colour mode
 * applied before paint, and Fumadocs' notebook layout with a KCQ header (wordmark → /home,
 * Docs, ⌘K search, GitHub ★, language, workstation, theme).
 */
export function DocsShell({ lang, children }: { lang: Lang; children: ReactNode }) {
  const t = UI[lang];
  return (
    <html lang={LOCALES[lang].htmlLang} suppressHydrationWarning>
      <head>
        {/* The KCQ public pages' theme script, byte for byte (CSP admits its hash). */}
        <script dangerouslySetInnerHTML={{ __html: themeInit.script }} />
        {fonts.preload.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body>
        <a className="kcq-skip" href="#nd-page">
          {t.skip}
        </a>
        <RootProvider
          theme={{ enabled: false }}
          search={{ SearchDialog: LazySearchDialog, options: { delayMs: 100 } }}
          i18n={{
            locale: lang,
            translations: {
              search: t.search,
              searchNoResult: t.searchNoResult,
              toc: t.toc,
              tocNoHeadings: t.tocNoHeadings,
              lastUpdate: t.lastUpdate,
              chooseLanguage: t.chooseLanguage,
              nextPage: t.nextPage,
              previousPage: t.previousPage,
              chooseTheme: t.theme,
              editOnGithub: t.editOnGithub,
            },
          }}
        >
          <DocsLayout
            tree={source.getPageTree(lang)}
            nav={{
              mode: "top",
              // A plain link: /home is the product's prerendered page, not part of this Next app.
              title: ({ className }) => (
                <a className={className} href={publicPath(lang, "home")} aria-label={t.home}>
                  <BrandMark />
                </a>
              ),
              children: (
                <a className="kcq-docs-label" href={docsPath(lang)}>
                  {t.docs}
                </a>
              ),
            }}
            links={[{ type: "custom", on: "all", children: <HeaderLinks lang={lang} /> }]}
            themeSwitch={{ component: <ThemeToggle lang={lang} /> }}
            sidebar={{ collapsible: false, defaultOpenLevel: 0, tabs: false }}
            tabMode="sidebar"
            i18n={false}
          >
            {children}
          </DocsLayout>
        </RootProvider>
      </body>
    </html>
  );
}
