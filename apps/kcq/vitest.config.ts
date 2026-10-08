import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { resolveChartSource } from "./scripts/chart-source.mjs";

const source = resolveChartSource(fileURLToPath(new URL(".", import.meta.url)));

export default defineConfig({
  resolve: {
    alias: {
      "@363045841yyt/klinechart-core/market-data/sources": resolve(
        source,
        "packages/core/dist/data/provider/impl/sources/index.js",
      ),
      "@363045841yyt/klinechart-core/market-data": resolve(
        source,
        "packages/core/dist/data/provider/index.js",
      ),
      "@363045841yyt/klinechart-core/persistence-scope": resolve(
        source,
        "packages/core/dist/foundation/persistence/persistence-scope.js",
      ),
      "@nebutra/auth/browser": fileURLToPath(
        new URL("../../packages/iam/auth/src/browser.ts", import.meta.url),
      ),
    },
  },
  test: { include: ["apps/kcq/src/**/*.test.{ts,tsx}"] },
});
