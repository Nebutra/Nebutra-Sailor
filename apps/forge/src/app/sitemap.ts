import type { MetadataRoute } from "next";
import { buildForgeSitemapEntries } from "@/lib/sitemap-entries";

/** Discovery file — cache for an hour so a registry blip does not 500 crawlers. */
export const revalidate = 3600;

/** G5/G24 — public tool + demand-root hub URLs in sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  return buildForgeSitemapEntries();
}
