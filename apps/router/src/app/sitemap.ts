import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import type { MetadataRoute } from "next";

/** G5/G24 — router public surfaces. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_ROUTER_URL ?? getBrandOrigin("router")).replace(/\/$/, "");
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/models`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/product`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/docs`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
