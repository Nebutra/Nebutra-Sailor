import { readdirSync } from "node:fs";
import { defineConfig } from "tsup";

/**
 * Two builds.
 *
 * ESM (what Next and every bundler resolve) gets one file per icon:
 * `dist/index.mjs` is a barrel of re-exports from `dist/components/<Icon>.mjs`.
 * A bundler then includes only the icon modules a route imports. With the old
 * single bundled file, the icon module was one webpack module shared by every
 * route, so its used exports were the union across the whole app: each page of
 * apps/landing shipped 153 icons (~23 KB gzip) to draw a handful.
 *
 * CJS stays one bundled file for `require()` consumers (tests, scripts).
 */
const components = readdirSync("src/components")
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => `src/components/${f}`);

export default defineConfig([
  {
    entry: ["src/index.ts", ...components],
    format: ["esm"],
    outDir: "dist",
    splitting: true,
    treeshake: false,
    clean: false,
  },
  {
    entry: ["src/index.ts"],
    format: ["cjs"],
    outDir: "dist",
    clean: false,
  },
]);
