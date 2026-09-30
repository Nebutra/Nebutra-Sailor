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

// Worker / OpenNext / static-export builds must stay lean: ts-morph (via
// fumadocs-typescript remarkAutoTypeTable) alone is ~12 MiB, and
// "processed" markdown doubles every page body into the bundle.
const isLeanBuild =
  process.env.OPEN_NEXT_BUILD === "true" || process.env.SAILOR_DOCS_OUTPUT === "export";

const typeTablePlugins: Pluggable[] = isLeanBuild
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
      // "processed" doubles every page body into the bundle. Prefer raw
      // markdown for LLM routes (see get-llm-text.ts) so the build stays lean.
      includeProcessedMarkdown: !isLeanBuild,
    },
  },
});

export default defineConfig({
  plugins: [lastModified()],
  mdxOptions: {
    // remarkFeedbackBlock auto-injects a <FeedbackBlock> at the end of every
    // page. It used to post through a "use server" action
    // (src/lib/github.ts, deleted with the static-export migration), which
    // output: "export" cannot build. It now posts client-side to the gateway
    // (backends/gateway/src/routes/docs/feedback.ts) instead — see
    // src/lib/feedback-client.ts and mdx-components.tsx.
    remarkPlugins: [remarkComponent, remarkMdxMermaid, remarkFeedbackBlock, ...typeTablePlugins],
    rehypePlugins: [],
  },
});
