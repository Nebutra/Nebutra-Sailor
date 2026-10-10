import { createFromSource } from "fumadocs-core/search/server";
import { createCjkTokenizer } from "./cjk-tokenizer";
import type { Lang } from "./i18n";
import { type DocsPage, source } from "./source";

/**
 * Hand-written pages are indexed in full. Generated and imported pages (tool and component
 * reference, changelog, source documents) index each heading and the first paragraph under it:
 * their tables repeat the same text for every tool or prop, and indexing long source documents in
 * full would make the index the visitor downloads on first search several megabytes.
 */
async function buildIndex(page: DocsPage) {
  const structuredData = page.data.structuredData;
  const compact = Boolean(page.data.generated);
  const seen = new Set<string | undefined>();
  return {
    title: page.data.title,
    description: page.data.description,
    url: page.url,
    id: page.url,
    structuredData: compact
      ? {
          ...structuredData,
          contents: structuredData.contents.filter((item) => {
            if (seen.has(item.heading)) return false;
            seen.add(item.heading);
            return true;
          }),
        }
      : structuredData,
  };
}

const server = createFromSource(source, {
  buildIndex,
  localeMap: { zh: { tokenizer: createCjkTokenizer() } },
});

/** The exported index for one language, in the shape fumadocs' static client loads. */
export async function searchIndex(lang: Lang) {
  const all = (await server.export()) as { type: "i18n"; data: Record<string, unknown> };
  return { type: "i18n", data: { [lang]: all.data[lang] } };
}
