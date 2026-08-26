import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  clean: true,
  minify: true,
  // CLI is a binary, not a library — no consumer imports types from it.
  // DTS generation also fails on some upstream type drift that would block publish.
  dts: false,
  // Bundle @nebutra/* workspace packages into dist/. They are build-time
  // (devDependency) only so the published package.json never asks npm to
  // resolve `workspace:*` — create-sailor@1.9.1 on npm broke `npx` with
  // EUNSUPPORTEDPROTOCOL when that protocol was left unrewritten.
  noExternal: [/^@nebutra\//],
});
