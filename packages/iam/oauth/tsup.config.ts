import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  // TODO: re-enable once oidc-provider v9 type annotations are resolved
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: false,
});
