import { defineConfig } from "tsup";

export default defineConfig({
  // Every subpath in package.json exports needs an entry here. ./frontier was
  // declared and imported by @nebutra/router-supply but never built: inside the
  // monorepo the workspace link resolves it to src/frontier.ts, so nothing
  // noticed until a deployed bundle enforced exports and the gateway crashed on
  // startup with ERR_MODULE_NOT_FOUND.
  entry: ["src/index.ts", "src/meta.ts", "src/catalog.ts", "src/frontier.ts"],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [],
  treeshake: true,
  minify: false,
});
