import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "brand-package/index": "src/brand-package/index.ts",
    "brand-package/use-brand": "src/brand-package/use-brand.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["react", "react-dom", "@nebutra/design-tokens", "next-themes"],
});
