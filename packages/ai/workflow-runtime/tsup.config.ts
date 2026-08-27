import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/sandbox.ts", "src/quickjs-sandbox.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["@nebutra/agent-runtime", "@nebutra/logger", "p-limit", "quickjs-emscripten"],
});
