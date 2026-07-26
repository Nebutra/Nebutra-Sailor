import { toHreflang } from "@nebutra/i18n/locales";
import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getArticles } from "@/lib/articles";
import { projects } from "@/lib/projects";

/**
 * Canonical origin for this site. Personal domain, not part of brand.domains, so
 * a literal is correct here — but it lives in exactly one place and robots.ts
 * imports it so the two files cannot drift.
 */
export const BASE_URL = "https://tsekaluk.dev";

type StaticRoute = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

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
 * Canonical URL for one (locale, path) pair.
 *
 * `localePrefix` is next-intl's default "always" (src/i18n/routing.ts), so the
 * prefix is never dropped — the unprefixed `${BASE_URL}${path}` form this file
 * also used to publish is a redirect, and redirect URLs must not be sitemapped.
 */
function urlFor(locale: string, path: string): string {
  return `${BASE_URL}/${locale}${path}`;
}

/**
 * hreflang cluster for a path: one entry per route locale plus a single
 * x-default at the default locale. Tags come from `toHreflang` (@nebutra/i18n),
 * never hand-written strings.
 */
function alternatesFor(path: string): { languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[toHreflang(locale)] = urlFor(locale, path);
  }
  languages["x-default"] = urlFor(routing.defaultLocale, path);
  return { languages };
}

function withLocales(
  path: string,
  opts: {
    lastModified?: Date;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  },
): MetadataRoute.Sitemap {
  const alternates = alternatesFor(path);

  return routing.locales.map((locale) => ({
    url: urlFor(locale, path),
    // `lastModified` is omitted rather than stamped with build time: a uniform
    // build timestamp is the exact pattern crawlers classify as untrustworthy.
    ...(opts.lastModified ? { lastModified: opts.lastModified } : {}),
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates,
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = STATIC_ROUTES.flatMap((route) =>
    withLocales(route.path, {
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }),
  );

  const projectRoutes: MetadataRoute.Sitemap = projects.flatMap((p) =>
    withLocales(`/work/${p.slug}`, {
      changeFrequency: "monthly",
      priority: 0.6,
    }),
  );

  const articleRoutes: MetadataRoute.Sitemap = getArticles().flatMap((a) =>
    withLocales(`/thinking/${a.slug}`, {
      lastModified: new Date(a.date),
      changeFrequency: "yearly",
      priority: 0.6,
    }),
  );

  return [...staticRoutes, ...projectRoutes, ...articleRoutes];
}
