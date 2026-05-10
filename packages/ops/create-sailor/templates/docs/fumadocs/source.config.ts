import { defineConfig, defineDocs, frontmatterSchema } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    // Add remark / rehype plugins here as needed.
    // See: https://fumadocs.vercel.app/docs/mdx
    remarkPlugins: [],
    rehypePlugins: [],
  },
});
