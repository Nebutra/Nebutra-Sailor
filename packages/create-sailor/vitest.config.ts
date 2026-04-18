import { defineConfig } from "vitest/config";

export default defineConfig({
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
