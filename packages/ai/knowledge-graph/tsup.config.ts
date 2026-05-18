import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    interfaces: "src/interfaces.ts",
    "link-extraction": "src/link-extraction.ts",
    "temporal-facts": "src/temporal-facts.ts",
    consolidate: "src/consolidate.ts",
    "hybrid-fusion": "src/hybrid-fusion.ts",
    provider: "src/provider.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
});
