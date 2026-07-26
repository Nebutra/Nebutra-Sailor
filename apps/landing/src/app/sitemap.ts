import { toContentLocale } from "@nebutra/i18n/locales";
import { getChangelogEntries } from "@nebutra/sanity/queries";
import type { MetadataRoute } from "next";
import { PACKAGE_FEATURE_ENTRIES } from "@/components/landing/features/package-feature-data";
import { routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";
import { getAllSolutionSlugs } from "@/lib/constants/solutions-data";
import { lastModifiedFor } from "@/lib/seo/lastmod";
import {
  isHighSignalFeatureEntry,
  localesForPath,
  SEO_ROUTE_REGISTRY,
  type SeoRouteEntry,
} from "@/lib/seo/route-registry";
import { buildHreflangAlternates, canonicalUrlForLocale, getSiteUrl } from "@/lib/seo/site-routes";

const CHANGELOG_CMS_TIMEOUT_MS = 3_000;

type SitemapEntry = MetadataRoute.Sitemap[number];

/**
 * One sitemap child per route locale — Next serves them at
 * `/sitemap/<locale>.xml`. Next emits NO index for a sharded sitemap, so the
 * index at `/sitemap.xml` is hand-written in `app/sitemap.xml/route.ts` and
 * shares this same shard-id SSOT.
 *
 * Sharding on the route-locale SSOT (not a hand list) means adding a language
 * adds a child automatically, and Search Console reports indexing health per
 * language instead of one 34-language blob.
 */
export function generateSitemaps(): Array<{ id: string }> {
  return routing.locales.map((id) => ({ id }));
}

/**
 * Next 16 hands the shard id to the sitemap handler as a *promise* that
 * resolves to the string (see `getDynamicSitemapRouteCode` in
 * next/dist/build/webpack/loaders/next-metadata-route-loader.js — it calls
 * `handler({ id: targetIdPromise })`). Reading `id` as a bare string silently
 * yields an empty sitemap for every shard, so the promise is awaited here and
 * a plain string is still accepted for direct callers/tests.
 */
export default async function sitemap({
  id,
}: {
  id: Promise<string | undefined> | string | undefined;
}): Promise<MetadataRoute.Sitemap> {
  const locale = await id;
  if (!locale || !routing.locales.includes(locale)) return [];

  const baseUrl = getSiteUrl();

  const entries: SitemapEntry[] = [];
  for (const route of SEO_ROUTE_REGISTRY) {
    if (!localesForPath(route.pattern).includes(locale)) continue;

    if (route.pattern.endsWith("/*")) {
      entries.push(...(await dynamicFamilyEntries(route, baseUrl, locale)));
    } else {
      entries.push(staticEntry(route, baseUrl, locale, route.pattern));
    }
  }

  return entries;
}

function staticEntry(
  route: SeoRouteEntry,
  baseUrl: string,
  locale: string,
  path: string,
  contentDate?: Date | null | string,
): SitemapEntry {
  const lastModified = lastModifiedFor(path, contentDate);
  return {
    url: canonicalUrlForLocale(baseUrl, locale, path),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: { languages: buildHreflangAlternates(baseUrl, path) },
  };
}

async function dynamicFamilyEntries(
  route: SeoRouteEntry,
  baseUrl: string,
  locale: string,
): Promise<SitemapEntry[]> {
  switch (route.pattern) {
    case "/blog/*": {
      const posts = await getAllPosts(toContentLocale(locale));
      return posts.map((post) =>
        staticEntry(route, baseUrl, locale, `/blog/${post.slug}`, post.date),
      );
    }
    case "/changelog/*": {
      const releases = await changelogReleases();
      return releases.map((release) =>
        staticEntry(route, baseUrl, locale, `/changelog/${release.version}`, release.publishedAt),
      );
    }
    case "/features/*": {
      // Package entries are auto-flattened from a file tree — hundreds of thin
      // near-identical pages. Same predicate the prerender path uses.
      return PACKAGE_FEATURE_ENTRIES.filter(isHighSignalFeatureEntry).map((entry) =>
        staticEntry(route, baseUrl, locale, `/features/${entry.slug}`),
      );
    }
    case "/solutions/*": {
      return getAllSolutionSlugs().map((slug) =>
        staticEntry(route, baseUrl, locale, `/solutions/${slug}`),
      );
    }
    default:
      return [];
  }
}

type ChangelogRelease = { readonly version: string; readonly publishedAt?: string };

/**
 * Released versions from the CMS — the same source the changelog pages read.
 * When the CMS is unreachable the family contributes no URLs rather than
 * publishing a hardcoded version list that would drift from the pages.
 */
async function changelogReleases(): Promise<ChangelogRelease[]> {
  if (process.env.E2E_SKIP_CMS === "1") return [];

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<[]>((resolve) => {
      timeoutId = setTimeout(() => resolve([]), CHANGELOG_CMS_TIMEOUT_MS);
    });
    const raw = (await Promise.race([getChangelogEntries(), timeout])) as ChangelogRelease[];
    return Array.isArray(raw) ? raw.filter((entry) => Boolean(entry?.version)) : [];
  } catch {
    return [];
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
