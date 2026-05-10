import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@nebutra/analytics": path.resolve(__dirname, "../analytics/src/index.ts"),
    },
    conditions: ["source"],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    timeout: 30000,
    testTimeout: 30000,
  },
});
