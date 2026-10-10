import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from "fumadocs-mdx/config";
import { z } from "zod";
import { codeThemes } from "./lib/code-themes";

/**
 * One collection, one directory per language (content/docs/{en,zh}). Hand-written pages are MDX;
 * documents imported from the chart source are plain Markdown (`.md`) and carry `sourceLang` and
 * `sourcePath`, so a page written in one language is marked as such in the other tree instead of
 * being machine-translated.
 */
export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema.extend({
      sourceLang: z.enum(["en", "zh"]).optional(),
      sourcePath: z.string().optional(),
      generated: z.boolean().optional(),
      originalTitle: z.string().optional(),
      descriptionInBody: z.boolean().optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: codeThemes,
      // Line highlights and focus via `// [!code highlight]` notation, word highlights via meta.
      inline: "tailing-curly-colon",
    },
  },
});
