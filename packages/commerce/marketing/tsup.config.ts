import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

/**
 * Prepend "use client" directive to all JS output files AFTER build.
 * This avoids rollup's "Module level directives cause errors when bundled" warning
 * that occurs when using tsup's `banner` option.
 */
function prependUseClient(distDir: string) {
  const directive = '"use client";\n';
  for (const file of readdirSync(distDir, { recursive: true }) as string[]) {
    if (!file.endsWith(".js")) continue;
    const filePath = join(distDir, file);
    const content = readFileSync(filePath, "utf-8");
    if (!content.startsWith('"use client"')) {
      writeFileSync(filePath, directive + content);
    }
  }
}

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
  onSuccess: async () => {
    const dist = join(process.cwd(), "dist");

    // 1. Prepend "use client" to all JS outputs (replaces banner approach)
    prependUseClient(dist);

    // 2. Copy CSS tokens to dist/styles
    const srcPath = join(process.cwd(), "src/styles/tokens.css");
    const stylesDir = join(dist, "styles");
    const distPath = join(stylesDir, "tokens.css");

    if (!existsSync(stylesDir)) {
      mkdirSync(stylesDir, { recursive: true });
    }

    if (existsSync(srcPath)) {
      copyFileSync(srcPath, distPath);
    }
  },
});
