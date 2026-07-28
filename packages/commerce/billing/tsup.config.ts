import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/stripe/index.ts",
    "src/polar/index.ts",
    "src/subscriptions/index.ts",
    "src/usage/index.ts",
    "src/credits/index.ts",
    "src/entitlements/index.ts",
    "src/config/index.ts",
    // Declared in package.json exports but absent here, so ./dist/<name>/index.js
    // never existed. Inside the monorepo the workspace link resolves the subpath
    // to src and nothing notices; a deployed bundle enforcing exports fails at
    // import time instead.
    "src/checkout/index.ts",
    "src/chinapay/index.ts",
    "src/lemonsqueezy/index.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["@nebutra/db", "@nebutra/contracts"],
});
