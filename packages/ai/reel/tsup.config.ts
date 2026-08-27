import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/transport/index.ts",
    "src/storyboard/index.ts",
    "src/store/memory.ts",
    "src/canvas/index.ts",
    "src/canvas/binding.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: [
    "@nebutra/agents",
    "@nebutra/atelier-canvas",
    "@nebutra/icons",
    "@nebutra/logger",
    "@nebutra/ui",
    "react",
    "react-dom",
  ],
});
