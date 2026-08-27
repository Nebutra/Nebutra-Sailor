import { remarkFeedbackBlock } from "fumadocs-core/mdx-plugins/remark-feedback-block";
import { defineConfig, defineDocs, frontmatterSchema } from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";
import { remarkMdxMermaid } from "fumadocs-mermaid";
import {
  createFileSystemGeneratorCache,
  createGenerator,
  remarkAutoTypeTable,
} from "fumadocs-typescript";
import type { Pluggable } from "unified";
import { z } from "zod";
import { remarkComponent } from "./lib/remark-component";

// Worker / OpenNext builds must stay under Cloudflare's 64 MiB uncompressed
// Worker limit. ts-morph (via fumadocs-typescript remarkAutoTypeTable) alone
// is ~12 MiB; full Shiki language packs add ~8 MiB more.
const isOpenNext = process.env.OPEN_NEXT_BUILD === "true";

const typeTablePlugins: Pluggable[] = isOpenNext
  ? []
  : [
      [
        remarkAutoTypeTable,
        {
          generator: createGenerator({
            cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
          }),
        },
      ],
    ];

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema.extend({
      status: z.enum(["stable", "beta", "deprecated", "experimental"]).optional(),
      figma: z.string().optional(),
    }),
    postprocess: {
      // "processed" doubles every page body into the server bundle. Prefer raw
      // markdown for LLM routes (see get-llm-text.ts) so CF Workers stays under
      // the 64 MiB handler limit.
      includeProcessedMarkdown: !isOpenNext,
    },
  },
});

export default defineConfig({
  plugins: [lastModified()],
  mdxOptions: {
    remarkPlugins: [remarkComponent, remarkMdxMermaid, remarkFeedbackBlock, ...typeTablePlugins],
    rehypePlugins: [],
  },
});
