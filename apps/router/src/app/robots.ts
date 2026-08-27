import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import type { MetadataRoute } from "next";

/** G24 — router public marketplace robots. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_ROUTER_URL ?? getBrandOrigin("router");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/models", "/product", "/docs"],
        disallow: ["/api/", "/dashboard", "/keys", "/playground"],
      },
    ],
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, "").replace(/\/$/, ""),
  };
}
