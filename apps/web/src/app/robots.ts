import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/en", "/zh", "/en/demo", "/zh/demo"],
        disallow: [
          "/api/",
          "/en/workspace",
          "/zh/workspace",
          "/en/admin",
          "/zh/admin",
          "/en/audit",
          "/zh/audit",
          "/en/atelier",
          "/zh/atelier",
          "/en/billing",
          "/zh/billing",
          "/en/checkout-return",
          "/zh/checkout-return",
          "/en/choose-plan",
          "/zh/choose-plan",
          "/en/integrations",
          "/zh/integrations",
          "/en/reel",
          "/zh/reel",
          "/en/settings",
          "/zh/settings",
          "/en/tenants",
          "/zh/tenants",
          "/en/theme-playground",
          "/zh/theme-playground",
          "/en/usage",
          "/zh/usage",
          "/en/notifications",
          "/zh/notifications",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
