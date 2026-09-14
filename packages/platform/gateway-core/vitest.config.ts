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
    // js-tiktoken carries the BPE rank tables for every encoding it supports —
    // several megabytes that are parsed the first time `#tokenizer` is
    // imported. That is real work, not a hang, and it lands on whichever test
    // touches the tokenizer first: countTokens directly, and the gateway
    // middleware through metering.
    //
    // Locally the whole file runs in ~2s and vitest's 5s default is never
    // close. A GitHub runner is 6-7x slower — the same file took 16.6s — so
    // the parse alone outruns the default and the test fails as a timeout.
    // That reads as a flake and is not one: it reproduced on re-run.
    //
    // It stayed hidden because `turbo run test` only builds affected packages
    // and gateway-core is rarely affected. The release PR bumps every
    // package.json, marks everything affected, and ran these for the first
    // time in a while — blocking the release with a number, not a defect.
    testTimeout: 30_000,
    hookTimeout: 30_000,
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
