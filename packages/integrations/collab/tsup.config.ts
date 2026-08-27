import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/store/memory.ts", "src/transport/loopback.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["@nebutra/tenant-store"],
});
