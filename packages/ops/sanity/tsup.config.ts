import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    queries: "src/queries.ts",
    image: "src/image.ts",
    client: "src/client.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["@sanity/client", "@sanity/image-url"],
  treeshake: true,
  target: "es2022",
});
