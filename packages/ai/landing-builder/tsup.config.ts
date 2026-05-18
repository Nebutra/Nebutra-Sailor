import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  sourcemap: true,
  dts: true,
  clean: true,
  target: "es2022",
  external: [/^@nebutra\//],
});
