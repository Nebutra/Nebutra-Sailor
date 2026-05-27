import { remarkFeedbackBlock } from "fumadocs-core/mdx-plugins/remark-feedback-block";
import { defineConfig, defineDocs, frontmatterSchema } from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";
import { remarkMdxMermaid } from "fumadocs-mermaid";
import {
  createFileSystemGeneratorCache,
  createGenerator,
  remarkAutoTypeTable,
} from "fumadocs-typescript";
import { z } from "zod";
import { remarkComponent } from "./lib/remark-component";

const generator = createGenerator({
  cache: createFileSystemGeneratorCache(".next/fumadocs-typescript"),
});

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema.extend({
      status: z.enum(["stable", "beta", "deprecated", "experimental"]).optional(),
      maturity: z.enum(["experimental", "beta", "stable", "canonical"]).optional(),
      figma: z.string().optional(),
      layer: z
        .enum(["foundation", "primitive", "composition", "pattern", "registry", "api", "guide"])
        .optional(),
      owner: z.string().optional(),
      package: z.string().optional(),
      source: z.string().optional(),
      primitive: z.string().optional(),
      substrate: z
        .enum(["base-ui", "native", "custom", "lobe-ui", "radix", "cmdk", "vaul", "mixed"])
        .optional(),
      registry: z.boolean().optional(),
      storybook: z.string().optional(),
      tokens: z.array(z.string()).optional(),
      a11y: z.array(z.string()).optional(),
      since: z.string().optional(),
      lastVerified: z.string().optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig({
  plugins: [lastModified()],
  mdxOptions: {
    remarkPlugins: [
      remarkComponent,
      remarkMdxMermaid,
      remarkFeedbackBlock,
      [remarkAutoTypeTable, { generator }],
    ],
    rehypePlugins: [],
  },
});
