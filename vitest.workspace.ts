import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      // Apps
      "apps/*/vitest.config.ts",
      // Packages
      "packages/*/vitest.config.ts",
    ],
  },
});
