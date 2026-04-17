import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/providers/index.ts",
    "src/config/index.ts",
    "src/meta.ts",
    "src/registry.ts",
  ],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [],
  treeshake: true,
  minify: false,
});
