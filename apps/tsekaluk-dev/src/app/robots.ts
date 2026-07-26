import type { MetadataRoute } from "next";
import { BASE_URL } from "./sitemap";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/admin/"],
      },
    ],
    // Origin literal lives once, in sitemap.ts, so the two files cannot drift.
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
