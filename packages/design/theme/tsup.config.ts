import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client.ts",
    languages: "src/languages.ts",
    "brand-package-surface": "src/brand-package-surface.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["react", "react-dom", "@nebutra/tokens", "next-themes"],
});
