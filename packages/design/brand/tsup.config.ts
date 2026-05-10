import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/metadata.ts", "src/components/Logo.tsx"],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react"],
});
