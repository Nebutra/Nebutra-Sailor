import type { MetadataRoute } from "next";

const PUBLIC_PATHS = ["/en", "/zh", "/en/demo/embed", "/zh/demo/embed"] as const;

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteUrl();
  const lastModified = new Date();

  return PUBLIC_PATHS.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency: path.endsWith("/demo/embed") ? "monthly" : "weekly",
    priority: path.endsWith("/demo/embed") ? 0.6 : 1,
  }));
}
