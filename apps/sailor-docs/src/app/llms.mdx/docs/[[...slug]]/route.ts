import { notFound } from "next/navigation";
import { getLLMText } from "@/lib/get-llm-text";
import { i18n } from "@/lib/i18n";
import { source } from "@/lib/source";

export const revalidate = false;

/**
 * Split an optional leading language segment off the slug.
 *
 * Callers disagreed about whether to include one, and the handler ignored the
 * question entirely: `source.getPage(slug)` with `["en", "getting-started", ...]`
 * finds nothing, so every `Accept: text/markdown` request 404'd — the whole
 * content-negotiation path was dead. The `.mdx` suffix route took the other
 * branch and dropped the language instead, so `/zh/<slug>.mdx` answered in
 * English. Accepting both shapes here makes the handler right for either caller.
 */
function splitLanguage(slug: string[] | undefined): { language: string; slugs: string[] } {
  const segments = slug ?? [];
  const [first, ...rest] = segments;

  return i18n.languages.includes(first as (typeof i18n.languages)[number])
    ? { language: first as string, slugs: rest }
    : { language: i18n.defaultLanguage, slugs: segments };
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const { language, slugs } = splitLanguage(slug);
  const page = source.getPage(slugs, language);

  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      "Content-Type": "text/markdown",
    },
  });
}

/**
 * Drop any param whose `slug` is a strict prefix of another param's `slug`.
 *
 * This route returns raw text via a Route Handler, so `output: "export"`
 * writes its static output as a literal file named after the slug (unlike an
 * HTML page, which always gets an `index.html` inside a directory). A
 * section that has both an index page AND child pages — `content/docs/en/
 * pebble/index.mdx` alongside `content/docs/en/pebble/mobile.mdx` — needs a
 * file at `pebble` AND a directory at `pebble/` for its children, which
 * collides (`EISDIR`) and fails the whole export. Skipping the index-only
 * param for those sections is the narrow fix: the section's own rendered
 * HTML page (`/pebble`) is unaffected — only its raw-markdown mirror at
 * `/llms.mdx/docs/pebble` is dropped, in favor of every child page's mirror
 * still working.
 */
function withoutIndexCollisions<T extends { slug?: string[]; lang?: string }>(params: T[]): T[] {
  // Scoped per language: an "en"-only section's index page must not be
  // dropped just because some unrelated "zh" page happens to share a slug
  // prefix.
  const byLang = new Map<string, string[][]>();
  for (const p of params) {
    const lang = p.lang ?? "";
    const list = byLang.get(lang) ?? [];
    list.push(p.slug ?? []);
    byLang.set(lang, list);
  }
  const isPrefixOfAnother = (lang: string, slug: string[]) =>
    (byLang.get(lang) ?? []).some(
      (other) =>
        other.length > slug.length && slug.every((segment, index) => other[index] === segment),
    );
  return params.filter((p) => !isPrefixOfAnother(p.lang ?? "", p.slug ?? []));
}

export function generateStaticParams() {
  return withoutIndexCollisions(source.generateParams());
}
