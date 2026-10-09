import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // package.json maps these runtime conditions to dist for deployments. Source
  // tests must run before this package builds, including on a clean CI checkout.
  resolve: {
    alias: {
      "#preview-db": fileURLToPath(new URL("./src/preview-mode.ts", import.meta.url)),
      "#preview-db-server": fileURLToPath(new URL("./src/preview-server.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: [
      "__tests__/**/*.{test,spec}.ts",
      "src/**/*.{test,spec}.ts",
      "scripts/**/*.{test,spec}.ts",
    ],
    passWithNoTests: false,
    // pglite spins up an in-memory Postgres VM; raise the per-test budget so
    // CI cold-starts don't trip on the default 5 s timeout.
    testTimeout: 30_000,
    // beforeEach also boots pglite; the default 10s hook timeout is too tight
    // on slower CI runners.
    hookTimeout: 30_000,
  },
});
