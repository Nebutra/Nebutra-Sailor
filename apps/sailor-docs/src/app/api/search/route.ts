import type { StructuredData } from "fumadocs-core/mdx-plugins";
import { createSearchAPI } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

export const { GET } = createSearchAPI("advanced", {
  indexes: source.getPages().map((page) => ({
    title: page.data.title || "",
    description: page.data.description || "",
    structuredData: (page.data as { structuredData?: StructuredData })
      .structuredData as StructuredData,
    id: page.url,
    url: page.url,
  })),
});
