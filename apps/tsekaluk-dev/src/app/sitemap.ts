import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/articles";
import { projects } from "@/lib/projects";
import { alternatesFor, localesForScope, type Scope, urlFor } from "@/lib/seo/alternates";

/**
 * The origin literal lives in @/lib/seo/alternates (one place, read by the
 * sitemap, robots.ts and json-ld.ts) and is re-exported here because robots.ts
 * has always imported it from this module.
 */
export { BASE_URL } from "@/lib/seo/alternates";

type StaticRoute = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

/**
 * Static routes are `ui`: their copy comes from the message catalogs
 * (messages/*.json, one per route locale), so every locale variant is a genuine
 * canonical URL rather than a duplicate of the English one.
 */
const STATIC_ROUTES: StaticRoute[] = [
  { path: "", changeFrequency: "weekly", priority: 1.0 },
  { path: "/work", changeFrequency: "weekly", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/soul", changeFrequency: "monthly", priority: 0.8 },
  { path: "/now", changeFrequency: "daily", priority: 0.7 },
  { path: "/thinking", changeFrequency: "weekly", priority: 0.7 },
  { path: "/uses", changeFrequency: "monthly", priority: 0.6 },
  { path: "/links", changeFrequency: "monthly", priority: 0.5 },
  { path: "/guestbook", changeFrequency: "daily", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
];

/**
 * One entry per locale the path is actually published in — every route locale
 * for `ui`, exactly one for `content`. A `content` family used to fan out to
 * one URL per route locale, each advertising the full cluster: dozens of
 * duplicates of a single English essay, all claiming to be canonical.
 */
function entriesFor(
  path: string,
  scope: Scope,
  opts: {
    lastModified?: Date;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  },
): MetadataRoute.Sitemap {
  return localesForScope(scope).map((locale) => {
    const alternates = alternatesFor(path, locale, scope);
    return {
      url: urlFor(locale, path),
      // `lastModified` is omitted rather than stamped with build time: a
      // uniform build timestamp is the exact pattern crawlers classify as
      // untrustworthy.
      ...(opts.lastModified ? { lastModified: opts.lastModified } : {}),
      changeFrequency: opts.changeFrequency,
      priority: opts.priority,
      ...(alternates ? { alternates } : {}),
    };
  });
}

/**
 * Deliberately unsharded: route locales × (10 static routes + the project
 * catalogue) plus the essays is on the order of 1,100 URLs, two orders of
 * magnitude under the 50,000-URL / 50 MB per-sitemap limit. Shard into a
 * sitemap index (one child per locale) only if either bound is approached.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = STATIC_ROUTES.flatMap((route) =>
    entriesFor(route.path, "ui", {
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }),
  );

  // Project detail pages read the `projects` message namespace
  // (src/lib/projects.ts, getLocalizedProjects), so they are catalog-translated
  // like the rest of the chrome.
  const projectRoutes: MetadataRoute.Sitemap = projects.flatMap((p) =>
    entriesFor(`/work/${p.slug}`, "ui", {
      changeFrequency: "monthly",
      priority: 0.6,
    }),
  );

  // Essays are single-language MDX (content/thinking/*.mdx has no locale
  // directories), so `content` scope publishes exactly one URL each.
  const articleRoutes: MetadataRoute.Sitemap = getArticles().flatMap((a) =>
    entriesFor(`/thinking/${a.slug}`, "content", {
      lastModified: new Date(a.date),
      changeFrequency: "yearly",
      priority: 0.6,
    }),
  );

  return [...staticRoutes, ...projectRoutes, ...articleRoutes];
}
