import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/identity.ts",
    "src/billing.ts",
    "src/events.ts",
    "src/notifications.ts",
    "src/sleptons.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
});
