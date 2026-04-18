import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/tools.ts",
    "src/providers/vercel-ai.ts",
    "src/providers/langchain.ts",
    "src/sdk/index.ts",
    "src/sdk/config.ts",
    "src/sdk/models.ts",
    "src/sdk/provider.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node20",
  outDir: "dist",
  splitting: true,
  external: ["ai", "@nebutra/logger", "@nebutra/cache", "@nebutra/billing"],
});
