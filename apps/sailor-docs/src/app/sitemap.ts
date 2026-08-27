import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import type { MetadataRoute } from "next";
import { languagesWithPage, pathFor, xDefaultLanguage } from "@/lib/docs-fallback";
import { htmlLangForLanguage } from "@/lib/i18n";
import { source } from "@/lib/source";

/**
 * Sitemap for the public docs origin.
 *
 * Inventory comes from the Fumadocs loader (the same `source` that
 * `[lang]/[[...slug]]/page.tsx` reads), so the sitemap cannot drift from what
 * the app actually serves. One <loc> per (language, slug) over `i18n.languages`,
 * i.e. `/en/<slug>` and `/zh/<slug>`.
 *
 * Deliberately absent:
 * - the legacy `/docs/...` and `/<lang>/docs/...` shapes — next.config.ts 301s
 *   them, and a redirect URL must never be published.
 * - `lastModified: new Date()` — a uniform build timestamp is the exact pattern
 *   crawlers classify as untrustworthy. The frontmatter/file mtime from the
 *   fumadocs `last-modified` plugin is used when present, otherwise the field is
 *   omitted, which is honest.
 */
function docsBaseUrl(): string {
  return process.env.NEXT_PUBLIC_DOCS_ORIGIN_URL?.replace(/\/+$/, "") || getBrandOrigin("docs");
}

function lastModifiedOf(data: unknown): Date | undefined {
  const raw = (data as { lastModified?: Date | number | string }).lastModified;
  if (!raw) return undefined;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = docsBaseUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const { language, pages } of source.getLanguages()) {
    for (const page of pages) {
      const slugs = page.slugs ?? [];

      // hreflang cluster: only the languages that actually have this page, keyed
      // by the app's own BCP-47 mapping (en → en-US, zh → zh-Hans-CN).
      const languages: Record<string, string> = {};
      for (const candidate of languagesWithPage(source, slugs)) {
        languages[htmlLangForLanguage(candidate)] = `${baseUrl}${pathFor(candidate, slugs)}`;
      }
      // Exactly one x-default, and only at a URL that resolves: the default
      // language when it has the page, otherwise the first language that does.
      // Latent today (the zh tree is a strict subset of en, so the default
      // language always has the page) — fixed structurally so the first
      // zh-only page cannot silently publish a 404 as its cluster's x-default.
      const xDefault = xDefaultLanguage(source, slugs);
      if (xDefault) languages["x-default"] = `${baseUrl}${pathFor(xDefault, slugs)}`;

      const lastModified = lastModifiedOf(page.data);

      entries.push({
        url: `${baseUrl}${pathFor(language, slugs)}`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: "weekly",
        priority: slugs.length <= 1 ? 0.8 : 0.6,
        alternates: { languages },
      });
    }
  }

  return entries;
}
