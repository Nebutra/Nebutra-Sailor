import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/server/contextServer.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node18",
  outDir: "dist",
  minify: false,
});
