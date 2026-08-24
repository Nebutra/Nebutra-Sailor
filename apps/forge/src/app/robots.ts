import type { MetadataRoute } from "next";
import { getForgeOrigin } from "@/lib/seo";

export const revalidate = 3600;

/** G24 — forge robots for public tool station. */
export default function robots(): MetadataRoute.Robots {
  const base = getForgeOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/t/", "/docs", "/llms.txt", "/indexnow-key.txt"],
        disallow: ["/api/", "/dashboard", "/wallet", "/keys"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ""),
  };
}
