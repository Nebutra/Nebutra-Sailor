import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  test: {
    environment: "node",
    globals: true,
    passWithNoTests: false,
    include: ["__tests__/**/*.{test,spec}.ts", "src/**/*.{test,spec}.ts"],
  },
});
