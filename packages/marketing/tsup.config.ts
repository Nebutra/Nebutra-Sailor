import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "components/index": "src/components/index.ts",
    "hooks/index": "src/hooks/index.ts",
    "utils/index": "src/utils/index.ts",
    "config/index": "src/config/index.ts",
  },
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "next"],
  treeshake: true,
  banner: {
    js: '"use client";',
  },
  onSuccess: async () => {
    // Copy CSS tokens to dist/styles
    const srcPath = join(process.cwd(), "src/styles/tokens.css");
    const distDir = join(process.cwd(), "dist/styles");
    const distPath = join(distDir, "tokens.css");

    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    if (existsSync(srcPath)) {
      copyFileSync(srcPath, distPath);
    }
  },
});
