import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    // `experimental.viteModuleRunner: false` used to be set here, with a tsx
    // loader via execArgv, on the grounds that it kept these contract tests
    // "closer to production ESM resolution".
    //
    // It did the opposite. Production imports oidc-provider — which is CJS —
    // through tsup output under Node, and that works. The raw-Node + tsx path
    // could not load it: any test file reaching provider.ts died with
    // `Expected a string, an ArrayBuffer, or a TypedArray to be returned for the
    // "source" from the "load" hook but got undefined`, before a single test
    // registered. So the config was less faithful to production, not more, and
    // provider-cookie-keys.test.ts — which pins how OIDC cookie signing keys are
    // resolved — had simply stopped running.
    //
    // With the default runner: 3 files, 19 tests. With the override: 1 file
    // unloadable, 13 tests.
  },
});
