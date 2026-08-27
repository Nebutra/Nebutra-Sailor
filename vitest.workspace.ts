import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      // Apps
      "apps/*/vitest.config.ts",
      // Packages (top-level)
      "packages/*/vitest.config.ts",
      // Packages (two-level deep, e.g. packages/design/brand)
      "packages/*/*/vitest.config.ts",
    ],
  },
});
