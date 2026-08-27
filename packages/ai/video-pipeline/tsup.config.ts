import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: [
    "@nebutra/capability-kit/debug",
    "@nebutra/errors",
    "@nebutra/generation-context",
    "@nebutra/image-pipeline",
    "@nebutra/reel/storyboard",
  ],
});
