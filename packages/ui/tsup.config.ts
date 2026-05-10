import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { defineConfig } from "tsup";

/**
 * Recursively walk a directory and yield POSIX-style relative paths
 * (relative to `root`). Skips node_modules and dist.
 */
function walk(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === "dist") continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) visit(full);
      else out.push(relative(root, full).split(sep).join("/"));
    }
  };
  visit(root);
  return out;
}

/** Read the first ~64 chars of a file (cheap directive sniff). */
function readHead(file: string): string {
  try {
    return readFileSync(file, "utf-8").slice(0, 128);
  } catch {
    return "";
  }
}

/** Does the file (or any .ts/.tsx beneath the same dir) declare "use client"? */
function entryNeedsUseClient(srcDir: string, entrySource: string): boolean {
  // If the entry file itself has the directive, done.
  const entryAbs = join(srcDir, entrySource);
  if (/^\s*["']use client["']/.test(readHead(entryAbs))) return true;

  // Otherwise scan everything under the entry's directory: if ANY descendant
  // .ts/.tsx file has the directive, the bundled barrel transitively contains
  // client code and the whole entry must be marked.
  const entryDir = dirname(entryAbs);
  if (!existsSync(entryDir)) return false;
  for (const rel of walk(entryDir)) {
    if (!rel.endsWith(".ts") && !rel.endsWith(".tsx")) continue;
    if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
    if (rel.endsWith(".spec.ts") || rel.endsWith(".spec.tsx")) continue;
    if (rel.endsWith(".stories.ts") || rel.endsWith(".stories.tsx")) continue;
    if (/^\s*["']use client["']/.test(readHead(join(entryDir, rel)))) {
      return true;
    }
  }
  return false;
}

/** Prepend "use client" to a built dist .js file if not already present. */
function prependUseClient(distFile: string): void {
  if (!existsSync(distFile)) return;
  const content = readFileSync(distFile, "utf-8");
  if (/^\s*["']use client["']/.test(content)) return;
  writeFileSync(distFile, `"use client";\n${content}`);
}

/** Copy a single file, creating parent dirs as needed. */
function copyAsset(srcAbs: string, destAbs: string): void {
  if (!existsSync(srcAbs)) return;
  const parent = dirname(destAbs);
  if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
  copyFileSync(srcAbs, destAbs);
}

/**
 * Entry map — keys are dist paths (sans .js), values are src files.
 * "tailwind.preset" is intentionally treated as a server-side build config
 * (consumed by Tailwind's Node runtime), so it must NOT be marked "use client".
 */
const ENTRIES: Record<string, string> = {
  index: "src/index.ts",
  "components/index": "src/components/index.ts",
  "layout/index": "src/layout/index.ts",
  "layouts/index": "src/layouts/index.ts",
  "icons/index": "src/icons/index.ts",
  "theme/index": "src/theme/index.ts",
  "primitives/index": "src/primitives/index.ts",
  "patterns/index": "src/patterns/index.ts",
  "typography/index": "src/typography/index.ts",
  "hooks/index": "src/hooks/index.ts",
  "utils/index": "src/utils/index.ts",
  "tailwind.preset": "src/tailwind.preset.ts",
};

const SERVER_ONLY_ENTRIES = new Set<string>(["tailwind.preset"]);

export default defineConfig({
  entry: ENTRIES,
  format: ["esm"],
  // DTS-only relaxation: source has long-standing strict-mode type debt
  // (exactOptionalPropertyTypes + noUncheckedIndexedAccess) in a few files
  // (e.g. layouts/SectionTheme.tsx). Runtime build is unaffected; consumers
  // still get accurate .d.ts types. Tightening these is a separate cleanup.
  dts: {
    compilerOptions: {
      exactOptionalPropertyTypes: false,
      noUncheckedIndexedAccess: false,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "es2022",
  external: [
    "react",
    "react-dom",
    "next",
    "framer-motion",
    "motion",
    "@base-ui/react",
    "@lobehub/ui",
    "@lobehub/ui/awesome",
    "@lobehub/ui/chat",
    "@lobehub/icons",
    "@lobehub/fluent-emoji",
    "antd",
    "antd-style",
    "@paper-design/shaders-react",
    "@number-flow/react",
    "@react-types/shared",
    "@internationalized/date",
    "@nebutra/brand",
    "@nebutra/tokens",
    "@nebutra/icons",
    "lucide-react",
    "recharts",
    "react-hook-form",
    "embla-carousel-react",
    "cmdk",
    "vaul",
    "sonner",
    "clsx",
    "tailwind-merge",
    "canvas-confetti",
    "cobe",
    "dotted-map",
    "rough-notation",
    "react-syntax-highlighter",
    "react-tweet",
    "react-use-measure",
    "react-resizable-panels",
    "input-otp",
    "usehooks-ts",
    "date-fns",
    "class-variance-authority",
    "piri",
    "react-ascii-text",
    "@icons-pack/react-simple-icons",
    "@react-three/fiber",
    "three",
    /^(react|react-dom|next|framer-motion|motion|@base-ui|@lobehub|antd|@paper-design|@number-flow|@react-types|@internationalized|@nebutra|lucide-react|recharts|react-hook-form|embla-carousel-react|cmdk|vaul|sonner|clsx|tailwind-merge|canvas-confetti|cobe|dotted-map|rough-notation|react-syntax-highlighter|react-tweet|react-use-measure|react-resizable-panels|input-otp|usehooks-ts|date-fns|class-variance-authority|piri|react-ascii-text|@icons-pack|@react-three|three)(\/.*)?$/,
  ],
  onSuccess: async () => {
    const cwd = process.cwd();
    const srcDir = join(cwd, "src");
    const distDir = join(cwd, "dist");

    // 1. For every entry, decide if its bundled output needs "use client".
    //    Scan the entry source AND everything beneath the entry's directory.
    for (const [distKey, srcEntry] of Object.entries(ENTRIES)) {
      if (SERVER_ONLY_ENTRIES.has(distKey)) continue;
      // Strip leading "src/" so it resolves against srcDir, not srcDir/src/.
      const relSource = srcEntry.replace(/^src\//, "");
      if (!entryNeedsUseClient(srcDir, relSource)) continue;
      prependUseClient(join(distDir, `${distKey}.js`));
    }

    // 2. Copy CSS / static assets that are referenced via package exports.
    copyAsset(join(srcDir, "typography/fonts.css"), join(distDir, "typography/fonts.css"));
    copyAsset(join(srcDir, "styles/globals.css"), join(distDir, "styles/globals.css"));
    copyAsset(
      join(srcDir, "styles/brand-override.css"),
      join(distDir, "styles/brand-override.css"),
    );
  },
});
