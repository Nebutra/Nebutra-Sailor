import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "tools/md-to-pdf": "src/tools/md-to-pdf.ts",
    "tools/w3-vin": "src/tools/w3-vin.ts",
    "tools/w3-secret-scan": "src/tools/w3-secret-scan.ts",
    "tools/w3-yaml-diff": "src/tools/w3-yaml-diff.ts",
    "tools/w3-env-diff": "src/tools/w3-env-diff.ts",
    "tools/w3-list-set-compare": "src/tools/w3-list-set-compare.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
});
