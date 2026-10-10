import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/notebook/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { docsPath, LANGS, type Lang, LOCALES, UI } from "@/lib/i18n";
import { KCQ_ORIGIN, LINKS } from "@/lib/site";
import { contentFile, contentLanguage, source } from "@/lib/source";
import { getMDXComponents } from "./mdx";
import { PageActions } from "./page-actions";

export function pageParams(lang: Lang) {
  return source.getPages(lang).map((page) => ({ slug: page.slugs }));
}

function resolve(lang: Lang, slug: string[] | undefined) {
  const page = source.getPage(slug, lang);
  if (!page) notFound();
  return page;
}

export function ogImagePath(lang: Lang, slugs: readonly string[]) {
  return `/docs/og/${lang}/${slugs.length ? slugs.join("/") : "index"}.png`;
}

export function pageMetadata(lang: Lang, slug: string[] | undefined): Metadata {
  const page = resolve(lang, slug);
  const slugs = page.slugs;
  const alternates = Object.fromEntries(
    LANGS.map((l) => [LOCALES[l].hreflang, `${KCQ_ORIGIN}${docsPath(l, slugs)}`]),
  );
  const image = `${KCQ_ORIGIN}${ogImagePath(lang, slugs)}`;
  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: `${KCQ_ORIGIN}${docsPath(lang, slugs)}`,
      languages: { ...alternates, "x-default": `${KCQ_ORIGIN}${docsPath("en", slugs)}` },
    },
    openGraph: {
      type: "article",
      siteName: "KLineChartQuant Docs",
      locale: LOCALES[lang].ogLocale,
      url: `${KCQ_ORIGIN}${docsPath(lang, slugs)}`,
      title: page.data.title,
      description: page.data.description,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.data.title,
      description: page.data.description,
      images: [image],
    },
  };
}

export function DocsPageView({ lang, slug }: { lang: Lang; slug: string[] | undefined }) {
  const page = resolve(lang, slug);
  const t = UI[lang];
  const MDX = page.data.body;
  const written = contentLanguage(page);
  const sourcePath = page.data.sourcePath;
  const edit = sourcePath ? LINKS.editSource(sourcePath) : LINKS.editDocs(contentFile(page));
  const note =
    written === lang ? null : lang === "zh" && !page.data.sourceLang ? t.fallback : t.onlyIn;
  return (
    <DocsPage
      toc={page.data.toc}
      tableOfContent={{ style: "clerk" }}
      breadcrumb={{ enabled: false }}
      footer={{ enabled: true }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.originalTitle ? (
        <DocsDescription lang={LOCALES[written].htmlLang}>
          {page.data.originalTitle}
        </DocsDescription>
      ) : page.data.description && !page.data.descriptionInBody ? (
        <DocsDescription>{page.data.description}</DocsDescription>
      ) : null}
      <PageActions
        lang={lang}
        markdown={`${docsPath(lang, page.slugs)}.md`}
        edit={edit}
        source={sourcePath ? LINKS.blob(sourcePath) : undefined}
      />
      {note ? (
        <p className="kcq-language-note" role="note">
          {note}
        </p>
      ) : null}
      <DocsBody lang={written === lang ? undefined : LOCALES[written].htmlLang}>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}
