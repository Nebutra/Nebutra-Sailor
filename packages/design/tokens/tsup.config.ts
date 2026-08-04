import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

/**
 * Client entrypoints that re-export hooks / ThemeProvider.
 * tsup/esbuild strips source "use client"; re-stamp so Next RSC accepts them.
 *
 * brand-package/index is intentionally server-safe (no useBrand) — do not
 * mark it "use client" or design-sync server imports break.
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
  // Prevent shared chunks that mix useBrand hooks into brand-package/index
  // (RSC import of compileReferoTokens would then pull useState).
  splitting: false,
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
