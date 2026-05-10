import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/**/*.{test,spec}.ts", "src/**/*.{test,spec}.ts"],
    passWithNoTests: false,
    // pglite spins up an in-memory Postgres VM; raise the per-test budget so
    // CI cold-starts don't trip on the default 5 s timeout.
    testTimeout: 30_000,
  },
});
