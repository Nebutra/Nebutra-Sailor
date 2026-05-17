import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["@nebutra/errors", "fastembed", "better-sqlite3", "@dao-xyz/sqlite3-vec"],
});
