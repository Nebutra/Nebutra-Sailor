import { toContentLocale } from "@nebutra/i18n/locales";
import { getChangelogEntries } from "@nebutra/sanity/queries";
import type { MetadataRoute } from "next";
import { PACKAGE_FEATURE_ENTRIES } from "@/components/landing/features/package-feature-data";
import { routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";
import { staticChangelogVersions } from "@/lib/changelog-releases";
import { getAllSolutionSlugs } from "@/lib/constants/solutions-data";
import { lastModifiedFor } from "@/lib/seo/lastmod";
import {
  isHighSignalFeatureEntry,
  localesForPath,
  SEO_ROUTE_REGISTRY,
  type SeoRouteEntry,
} from "@/lib/seo/route-registry";
import {
  buildHreflangAlternates,
  canonicalUrlForLocale,
  defaultPublicationSet,
  getSiteUrl,
  isPublishedIn,
  type PublicationSet,
  pathInLocale,
} from "@/lib/seo/site-routes";

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
      entries.push(entryFor(route, baseUrl, locale, defaultPublicationSet(route.pattern)));
    }
  }

  return entries;
}

/**
 * One sitemap entry for one member of a publication set.
 *
 * The set — not a bare path string — is the input, because a `<url>` and its
 * `<xhtml:link>` cluster must describe the same document family. Keying on a
 * single path forces the sibling URL to be *fabricated* from this locale's
 * slug, which is how the zh shard came to advertise an English URL built from a
 * Chinese slug (and vice versa): two shards, two disjoint URL sets, reciprocity
 * broken in both directions.
 */
function entryFor(
  route: SeoRouteEntry,
  baseUrl: string,
  locale: string,
  set: PublicationSet,
  contentDate?: Date | null | string,
): SitemapEntry {
  const path = pathInLocale(set, locale);
  const lastModified = lastModifiedFor(path, contentDate);
  return {
    url: canonicalUrlForLocale(baseUrl, locale, path),
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: { languages: buildHreflangAlternates(baseUrl, set) },
  };
}

async function dynamicFamilyEntries(
  route: SeoRouteEntry,
  baseUrl: string,
  locale: string,
): Promise<SitemapEntry[]> {
  switch (route.pattern) {
    case "/blog/*": {
      // Paired on translationKey so each post cluster carries the real slug of
      // each language, and a post that exists in one language only advertises
      // a single-member cluster instead of inventing its sibling.
      const publications = await blogPublications();
      return publications
        .filter(({ set }) => isPublishedIn(set, locale))
        .map(({ set, dates }) => entryFor(route, baseUrl, locale, set, dates[locale]));
    }
    case "/changelog/*": {
      const releases = await changelogReleases();
      return releases.map((release) =>
        entryFor(
          route,
          baseUrl,
          locale,
          defaultPublicationSet(`/changelog/${release.version}`),
          release.publishedAt,
        ),
      );
    }
    case "/features/*": {
      // Package entries are auto-flattened from a file tree — hundreds of thin
      // near-identical pages. Same predicate the prerender path uses.
      return PACKAGE_FEATURE_ENTRIES.filter(isHighSignalFeatureEntry).map((entry) =>
        entryFor(route, baseUrl, locale, defaultPublicationSet(`/features/${entry.slug}`)),
      );
    }
    case "/solutions/*": {
      return getAllSolutionSlugs().map((slug) =>
        entryFor(route, baseUrl, locale, defaultPublicationSet(`/solutions/${slug}`)),
      );
    }
    default:
      return [];
  }
}

type BlogPublication = {
  readonly set: PublicationSet;
  /** Best content timestamp per member locale. */
  readonly dates: Readonly<Record<string, string | undefined>>;
};

/**
 * Blog posts grouped into translation clusters.
 *
 * `translationKey` is normalized onto every post by `@/lib/blog`; a post
 * without one is its own single-member cluster.
 */
async function blogPublications(): Promise<BlogPublication[]> {
  type Bucket = {
    locales: string[];
    pathByLocale: Record<string, `/${string}`>;
    dates: Record<string, string | undefined>;
  };
  const byKey = new Map<string, Bucket>();

  for (const contentLocale of localesForPath("/blog/*")) {
    const posts = await getAllPosts(toContentLocale(contentLocale));
    for (const post of posts) {
      const key = post.translationKey ?? `${contentLocale}::${post.slug}`;
      const bucket = byKey.get(key) ?? { locales: [], pathByLocale: {}, dates: {} };
      if (!bucket.locales.includes(contentLocale)) bucket.locales.push(contentLocale);
      bucket.pathByLocale[contentLocale] = `/blog/${post.slug}`;
      // `updatedAt` (Sanity _updatedAt) is the honest edit time; `date` is the
      // publication date and may be the epoch sentinel, which lastmod rejects.
      bucket.dates[contentLocale] = post.updatedAt ?? post.date;
      byKey.set(key, bucket);
    }
  }

  return [...byKey.values()].map((bucket) => {
    const primary = bucket.locales.includes(routing.defaultLocale)
      ? routing.defaultLocale
      : (bucket.locales[0] as string);
    return {
      set: {
        path: bucket.pathByLocale[primary] as `/${string}`,
        locales: bucket.locales,
        pathByLocale: bucket.pathByLocale,
      },
      dates: bucket.dates,
    };
  });
}

type ChangelogRelease = { readonly version: string; readonly publishedAt?: string };

/**
 * Released versions — CMS first, then the static inventory the changelog pages
 * themselves fall back to (`@/lib/changelog-releases`).
 *
 * Falling back rather than returning `[]` is the point. A CMS blip used to
 * delete a whole family of live, indexable URLs from the sitemap
 * non-deterministically — the sitemap would disagree with the pages about which
 * releases exist. Sharing one static inventory means the offline sitemap
 * publishes exactly the versions the offline detail page serves.
 */
async function changelogReleases(): Promise<ChangelogRelease[]> {
  const fromCms = await changelogReleasesFromCms();
  if (fromCms.length > 0) return fromCms;
  return staticChangelogVersions().map((version) => ({ version }));
}

async function changelogReleasesFromCms(): Promise<ChangelogRelease[]> {
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
