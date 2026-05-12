import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  clean: true,
  minify: true,
  // CLI is a binary, not a library — no consumer imports types from it.
  // DTS generation also fails on some upstream type drift that would block publish.
  dts: false,
});
