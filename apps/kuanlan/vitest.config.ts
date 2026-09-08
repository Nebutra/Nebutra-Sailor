import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/test/server-only.shim.ts"),
      // Subpath first: the bare alias below is a prefix match and would turn
      // `@nebutra/auth/server` into `index.ts/server`.
      "@nebutra/auth/server": path.resolve(__dirname, "../../packages/iam/auth/src/server.ts"),
      "@nebutra/auth": path.resolve(__dirname, "../../packages/iam/auth/src/index.ts"),
    },
  },
});
