import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "mcp-catalog": "src/mcp-catalog.ts",
    "dispatcher-sse": "src/dispatcher-sse.ts",
    "prisma-rollout": "src/prisma-rollout.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  external: ["@nebutra/agent-runtime"],
});
