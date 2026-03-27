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
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["@nebutra/db", "@nebutra/contracts"],
});
