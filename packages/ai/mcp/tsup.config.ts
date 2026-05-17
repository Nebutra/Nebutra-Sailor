import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts", "src/server/contextServer.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node18",
  outDir: "dist",
  minify: false,
  external: [
    "@modelcontextprotocol/sdk",
    "@nebutra/errors",
    "@nebutra/event-log",
    "@nebutra/trace-store",
  ],
});
