import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

/**
 * Entries that re-export client hooks/components (ThemeProvider, useBrand).
 * tsup/esbuild strips the source "use client" directive; without re-stamping
 * the dist file, Next RSC fails on ECS `build:next` with useState-in-RSC.
 */
const CLIENT_DIST_ENTRIES = ["index", "brand-package/use-brand"] as const;

function prependUseClient(distFile: string): void {
  if (!existsSync(distFile)) return;
  const content = readFileSync(distFile, "utf-8");
  if (/^\s*["']use client["']/.test(content)) return;
  writeFileSync(distFile, `"use client";\n${content}`);
}

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "brand-package/index": "src/brand-package/index.ts",
    "brand-package/use-brand": "src/brand-package/use-brand.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["react", "react-dom", "@nebutra/design-tokens", "next-themes"],
  onSuccess: async () => {
    const distDir = join(process.cwd(), "dist");
    for (const key of CLIENT_DIST_ENTRIES) {
      prependUseClient(join(distDir, `${key}.js`));
    }
  },
});
