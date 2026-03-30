import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const staticPaths = [
  // Core pages
  { path: "", changeFreq: "weekly" as const, priority: 1.0 },
  { path: "/features", changeFreq: "weekly" as const, priority: 0.9 },
  { path: "/pricing", changeFreq: "weekly" as const, priority: 0.9 },
  { path: "/about", changeFreq: "monthly" as const, priority: 0.7 },
  { path: "/get-license", changeFreq: "weekly" as const, priority: 0.9 },
  { path: "/licensing", changeFreq: "monthly" as const, priority: 0.7 },

  // Content pages
  { path: "/blog", changeFreq: "weekly" as const, priority: 0.8 },
  { path: "/changelog", changeFreq: "weekly" as const, priority: 0.6 },
  { path: "/showcase", changeFreq: "weekly" as const, priority: 0.7 },
  { path: "/roadmap", changeFreq: "monthly" as const, priority: 0.5 },

  // Community / ecosystem
  { path: "/ideas", changeFreq: "weekly" as const, priority: 0.6 },
  { path: "/opc", changeFreq: "monthly" as const, priority: 0.5 },

  // Support
  { path: "/contact", changeFreq: "monthly" as const, priority: 0.4 },
  { path: "/faq", changeFreq: "monthly" as const, priority: 0.4 },

  // Legal
  { path: "/privacy", changeFreq: "monthly" as const, priority: 0.2 },
  { path: "/terms", changeFreq: "monthly" as const, priority: 0.2 },
  { path: "/cookies", changeFreq: "monthly" as const, priority: 0.2 },
  { path: "/refund", changeFreq: "monthly" as const, priority: 0.2 },
];

function localizedUrl(base: string, locale: string, path: string): string {
  return locale === routing.defaultLocale ? `${base}${path}` : `${base}/${locale}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nebutra.com";

  // Generate entries for all static pages across all locales
  const staticEntries = staticPaths.flatMap((page) => {
    const languages = Object.fromEntries(
      routing.locales.map((l) => [l, localizedUrl(baseUrl, l, page.path)]),
    );

    return routing.locales.map((locale) => ({
      url: localizedUrl(baseUrl, locale, page.path),
      lastModified: new Date(),
      changeFrequency: page.changeFreq,
      priority: page.priority,
      alternates: { languages },
    }));
  });

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
      url: localizedUrl(baseUrl, locale, `/changelog/${version}`),
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  });

  return [...staticEntries, ...changelogEntries];
}
