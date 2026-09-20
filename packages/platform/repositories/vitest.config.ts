import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
    // The *.sql.test.ts suites bring up pglite — Postgres compiled to WASM —
    // in beforeEach, then load a schema and seed a row. That is real work, not
    // a hang, and its cost lands almost entirely on the first test of a file,
    // which pays the WASM cold start.
    //
    // Locally that first hook finishes inside ~940ms and vitest's 10s default
    // is never close. A shared GitHub runner is an order of magnitude slower:
    // the measured hook took 11.2s and failed as
    // "Hook timed out in 10000ms", which blocked two unrelated PRs (#585,
    // #592) and passed on re-run both times. A budget that a re-run fixes is a
    // budget, not a flake.
    //
    // 60s is roughly 5x the slowest hook observed in CI. Nothing here should
    // approach it; if something does, that is a real hang worth failing on.
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
});
