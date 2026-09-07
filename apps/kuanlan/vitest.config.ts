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
      "@nebutra/auth": path.resolve(__dirname, "../../packages/iam/auth/src/index.ts"),
    },
  },
});
