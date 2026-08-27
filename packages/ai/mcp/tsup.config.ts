import { defineConfig } from "tsup";

export default defineConfig({
  // src/middleware is documented as @nebutra/mcp/middleware in the README
  // and exists in src, but was never an entry — so the subpath the docs
  // teach resolved to nothing in a published install.
  entry: ["src/index.ts", "src/cli.ts", "src/server/contextServer.ts", "src/middleware/index.ts"],
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
