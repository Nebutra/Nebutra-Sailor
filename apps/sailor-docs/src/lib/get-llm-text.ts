import type { InferPageType } from "fumadocs-core/source";
import type { DocData, DocMethods } from "fumadocs-mdx/runtime/types";
import type { source } from "@/lib/source";

// fumadocs-core 16's `InferPageType` returns only the bare PageData. The MDX
// runtime adds `getText` (DocMethods) at access time, but the loader generics
// don't propagate it. Cast at the call site.
type MdxPageData = InferPageType<typeof source>["data"] & DocData & DocMethods;

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await (page.data as MdxPageData).getText("processed");
  return `# ${page.data.title} (${page.url})\n\n${processed}`;
}
