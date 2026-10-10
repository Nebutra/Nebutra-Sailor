import { notFound } from "next/navigation";
import type { Lang } from "./i18n";
import { pageMarkdown } from "./llms";
import { source } from "./source";

/**
 * `<page>.md` for every page. Next writes these as docs/md/<slug>.md; scripts/postbuild.mjs moves
 * them next to the pages (/docs/<slug>.md, /docs.md for the root).
 */
export function markdownParams(lang: Lang) {
  return source.getPages(lang).map((page) => {
    const slugs = page.slugs.length ? [...page.slugs] : ["index"];
    slugs[slugs.length - 1] = `${slugs[slugs.length - 1]}.md`;
    return { slug: slugs };
  });
}

export async function markdownResponse(lang: Lang, slug: string[]) {
  const slugs = [...slug];
  slugs[slugs.length - 1] = (slugs[slugs.length - 1] ?? "").replace(/\.md$/, "");
  const page = source.getPage(slugs[0] === "index" && slugs.length === 1 ? [] : slugs, lang);
  if (!page) notFound();
  return new Response(await pageMarkdown(page, lang), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
