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
    include: ["src/**/*.test.ts"],
    // providers.test.ts is a standalone tsx smoke script (no suite); exclude
    // it from the vitest run so the package `test` script stays green.
    exclude: ["**/node_modules/**", "**/providers.test.ts"],
    timeout: 15000,
    testTimeout: 15000,
  },
});
