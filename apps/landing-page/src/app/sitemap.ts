import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { type BlogLanguage, getAllPosts } from "@/lib/blog";
import {
  buildHreflangAlternates,
  canonicalUrlForLocale,
  getSiteUrl,
  PUBLIC_SEO_ROUTES,
} from "@/lib/seo/site-routes";

function contentLanguageForLocale(locale: string): BlogLanguage {
  return locale === "zh" ? "zh" : "en";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  // Generate entries for all static pages across all locales
  const staticEntries = PUBLIC_SEO_ROUTES.flatMap((page) => {
    const languages = buildHreflangAlternates(baseUrl, page.path);

    return routing.locales.map((locale) => ({
      url: canonicalUrlForLocale(baseUrl, locale, page.path),
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: { languages },
    }));
  });

  const docsLanguages = {
    en: `${baseUrl}/docs`,
    "zh-Hans": `${baseUrl}/zh/docs`,
    "x-default": `${baseUrl}/docs`,
  };
  const docsEntries = [
    {
      url: docsLanguages.en,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: { languages: docsLanguages },
    },
    {
      url: docsLanguages["zh-Hans"],
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: { languages: docsLanguages },
    },
  ];

  // Individual changelog version URLs
  const changelogVersions = [
    "0.10.0",
    "0.9.1",
    "0.9.0",
    "0.8.0",
    "0.7.0",
    "0.6.0",
    "0.5.0",
    "0.4.0",
  ];
  const changelogEntries = changelogVersions.flatMap((version) => {
    return routing.locales.map((locale) => ({
      url: canonicalUrlForLocale(baseUrl, locale, `/changelog/${version}`),
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  });

  // Dynamic blog post entries
  const [englishPosts, chinesePosts] = await Promise.all([getAllPosts("en"), getAllPosts("zh")]);
  const postsByLanguage: Record<"en" | "zh", typeof englishPosts> = {
    en: englishPosts,
    zh: chinesePosts,
  };

  const blogEntries = routing.locales.flatMap((locale) => {
    const contentLanguage = contentLanguageForLocale(locale);
    return postsByLanguage[contentLanguage].map((post) => ({
      url: canonicalUrlForLocale(baseUrl, locale, `/blog/${post.slug}`),
      lastModified: post.date ? new Date(post.date) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  });

  return [...staticEntries, ...docsEntries, ...changelogEntries, ...blogEntries];
}
