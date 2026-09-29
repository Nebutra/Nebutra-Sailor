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
    // remarkFeedbackBlock (auto-injects a <FeedbackBlock> at the end of every
    // page) removed with the GitHub-App feedback feature: it posted through a
    // "use server" action, which output: "export" cannot build at all, and
    // which needed GITHUB_APP_ID/GITHUB_APP_PRIVATE_KEY this static deploy
    // has no server to hold. See src/lib/github.ts (deleted) and
    // docs/architecture — the feature can come back as a client-side link to
    // a GitHub Discussion "new" URL, which needs no server, if it's missed.
    remarkPlugins: [remarkComponent, remarkMdxMermaid, ...typeTablePlugins],
    rehypePlugins: [],
  },
});
