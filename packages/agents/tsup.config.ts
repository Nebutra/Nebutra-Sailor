import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/tools.ts",
    "src/providers/vercel-ai.ts",
    "src/providers/langchain.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node20",
  outDir: "dist",
  splitting: true,
  external: ["ai", "@nebutra/logger", "@nebutra/cache"],
});
