import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/debug.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
});
