import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    passWithNoTests: false,
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/index.ts",
        "src/types.ts",
        // keyword.ts is a thin lazy adapter over the external @nebutra/search
        // backend (Meilisearch/Typesense/Algolia). Its real branches require
        // live search infra and are exercised by integration, not unit, tests.
        // tool.ts type surface re-exported; covered by tool.test.ts behaviour.
        "src/keyword.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
