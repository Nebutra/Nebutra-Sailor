import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { DEMAND_ROOTS } from "@nebutra/forge-runtime";
import type { MetadataRoute } from "next";
import { getForgeRegistry } from "@/lib/registry";

/** G5/G24 — public tool + demand-root hub URLs in sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_FORGE_URL ?? getBrandOrigin("forge")).replace(/\/$/, "");
  const tools = getForgeRegistry().list();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/docs`, changeFrequency: "monthly", priority: 0.6 },
    ...DEMAND_ROOTS.map((root) => ({
      url: `${base}/r/${root}`,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
    ...tools.map((tool) => ({
      url: `${base}${tool.path}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
