import { defineConfig } from "vitest/config";

const tsxApi = import.meta.resolve("tsx/esm/api");

export default defineConfig({
  test: {
    execArgv: [`--import=data:text/javascript,import * as tsx from "${tsxApi}";tsx.register()`],
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    experimental: {
      // OAuth server tests are pure Node contract tests. Running without Vite's
      // module runner keeps them closer to production ESM resolution.
      viteModuleRunner: false,
    },
  },
});
