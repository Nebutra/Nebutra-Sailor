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
    "@nebutra/content-store",
    "@nebutra/document-pipeline",
    "@nebutra/errors",
    "@nebutra/integration-vault",
    "@nebutra/knowledge-rag",
  ],
});
