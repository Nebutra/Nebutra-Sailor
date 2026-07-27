import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import type { MetadataRoute } from "next";
import { getForgeRegistry } from "@/lib/registry";

/** G5/G24 — public tool URLs in sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_FORGE_URL ?? getBrandOrigin("forge")).replace(/\/$/, "");
  const tools = getForgeRegistry().list();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/docs`, changeFrequency: "monthly", priority: 0.6 },
    ...tools.map((tool) => ({
      url: `${base}${tool.path}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
