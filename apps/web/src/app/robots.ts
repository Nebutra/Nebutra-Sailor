import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        // Cookie-based i18n: no /en or /zh URL prefixes — use locale-less paths.
        allow: ["/", "/demo"],
        disallow: [
          "/api/",
          "/workspace",
          "/admin",
          "/audit",
          "/atelier",
          "/billing",
          "/checkout-return",
          "/choose-plan",
          "/integrations",
          "/reel",
          "/settings",
          "/tenants",
          "/theme-playground",
          "/usage",
          "/notifications",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
