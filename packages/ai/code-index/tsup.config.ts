import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    interfaces: "src/interfaces.ts",
    chunker: "src/chunker.ts",
    "index-engine": "src/index-engine.ts",
    provider: "src/provider.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
});
