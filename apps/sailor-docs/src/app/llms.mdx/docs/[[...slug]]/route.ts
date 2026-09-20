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

export function generateStaticParams() {
  return source.generateParams();
}
