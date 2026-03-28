import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nebutra.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/sign-in", "/sign-up", "/admin/", "/settings/"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/blog/", "/docs/", "/features", "/pricing"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/blog/", "/docs/", "/features", "/pricing"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
