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
      "@nebutra/billing": path.resolve(__dirname, "../../packages/commerce/billing/src/index.ts"),
      "@nebutra/license": path.resolve(__dirname, "../../packages/commerce/license/src/index.ts"),
      "@nebutra/logger": path.resolve(__dirname, "../../packages/platform/logger/src/index.ts"),
    },
  },
});
