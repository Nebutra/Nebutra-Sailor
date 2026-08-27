import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // package.json maps #tokenizer to dist/; unit tests run against src/.
      "#tokenizer": path.join(rootDir, "src/metering/encoding.node.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    passWithNoTests: false,
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
