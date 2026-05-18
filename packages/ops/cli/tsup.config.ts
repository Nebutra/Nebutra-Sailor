import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node18",
  clean: true,
  minify: true,
  dts: true,
  // Bundle @nebutra/* workspace packages into dist/. The published @nebutra/*
  // packages ship .ts sources (not built .js), which Node refuses to import
  // from node_modules. Bundling them in at build time keeps the CLI runnable
  // standalone after `npm i -g nebutra`.
  noExternal: [/^@nebutra\//],
});
