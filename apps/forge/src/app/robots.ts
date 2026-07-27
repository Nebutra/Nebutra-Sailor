import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import type { MetadataRoute } from "next";

/** G24 — forge robots for public tool station. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_FORGE_URL ?? getBrandOrigin("forge");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/t/", "/docs"],
        disallow: ["/api/", "/dashboard", "/wallet", "/keys"],
      },
    ],
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, "").replace(/\/$/, ""),
  };
}
