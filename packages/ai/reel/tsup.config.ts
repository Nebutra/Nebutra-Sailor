import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/transport/index.ts", "src/store/memory.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["@nebutra/atelier-canvas", "@nebutra/logger", "@nebutra/agents"],
});
