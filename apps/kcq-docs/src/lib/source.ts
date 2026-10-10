import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";
import { docs } from "@/.source/server";
import { docsPath, i18n, isLang, type Lang } from "./i18n";

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  i18n,
  url: (slugs, locale) => docsPath(isLang(locale) ? locale : "en", slugs),
});

export type DocsPage = InferPageType<typeof source>;

/** The language a page's text is written in: imported documents declare it, hand-written pages
 * take it from their directory (a Chinese route showing an English file is a fallback). */
export function contentLanguage(page: DocsPage): Lang {
  if (page.data.sourceLang) return page.data.sourceLang;
  const dir =
    (page.absolutePath ?? page.path).match(/content\/docs\/(en|zh)\//)?.[1] ??
    page.path.split("/")[0];
  return isLang(dir) ? dir : "en";
}

/** Repository-relative path of the file a page is built from. */
export function contentFile(page: DocsPage): string {
  const abs = page.absolutePath ?? "";
  const index = abs.indexOf("content/docs/");
  return index >= 0
    ? `apps/kcq-docs/${abs.slice(index)}`
    : `apps/kcq-docs/content/docs/${page.path}`;
}

export function pageSlugs(page: DocsPage): string[] {
  return page.slugs;
}
