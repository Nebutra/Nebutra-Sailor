import { DEMAND_ROOTS, F0_BATCH1_TOOLS } from "@nebutra/forge-runtime";
import type { MetadataRoute } from "next";
import { getForgeRegistry } from "@/lib/registry";
import { getForgeOrigin } from "@/lib/seo";

/** Host-only tool that stays out of F0 defaults so sitemap listing can avoid Playwright. */
const HOST_ONLY_TOOL_PATHS = ["/t/md-to-pdf"] as const;

function uniquePaths(paths: readonly string[]): string[] {
  return [...new Set(paths.filter((path) => path.startsWith("/")))];
}

export function listPublicToolPaths(
  listTools: () => ReadonlyArray<{ readonly path: string }> = () => getForgeRegistry().list(),
): string[] {
  try {
    return uniquePaths(listTools().map((tool) => tool.path));
  } catch {
    return uniquePaths([
      ...F0_BATCH1_TOOLS.map((tool) => `/t/${tool.slug}`),
      ...HOST_ONLY_TOOL_PATHS,
    ]);
  }
}

/** Public HTML URLs advertised to crawlers. Never stamps build-time lastmod. */
export function buildForgeSitemapEntries(origin = getForgeOrigin()): MetadataRoute.Sitemap {
  const base = origin.replace(/\/$/, "");
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/docs`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/llms.txt`, changeFrequency: "weekly", priority: 0.4 },
    ...DEMAND_ROOTS.map((root) => ({
      url: `${base}/r/${root}`,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
    ...listPublicToolPaths().map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
