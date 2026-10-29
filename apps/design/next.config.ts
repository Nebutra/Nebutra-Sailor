import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "../..");

/**
 * Repo files this app reads with `fs` at runtime. Next's file tracer only
 * follows imports and a few literal path patterns, so most of these never reach
 * the standalone tree on their own — and the walk-up locators in ui-source.ts,
 * tokens/model.ts, tokens/pipeline.ts and tokens/theme-registry.ts throw at
 * module load when their probe file is missing. Globs resolve from this app's
 * directory; the files land at the same repo-relative path under the standalone
 * root because outputFileTracingRoot is the monorepo root.
 */
const RUNTIME_READ_FILES = [
  // ui-source.ts, showcase-source.ts, api-docs.ts (sources + the ui tsconfig)
  "../../packages/design/ui/src/**/*",
  "../../packages/design/ui/tsconfig.json",
  // tokens/model.ts, tokens/pipeline.ts, motion/roles.ts
  "../../packages/design/design-tokens/tokens/**/*",
  "../../packages/design/design-tokens/style-dictionary.config.mjs",
  "../../packages/design/design-tokens/build/css/styles.generated.css",
  // tokens/theme-registry.ts, tokens/pipeline.ts
  "../../packages/design/tokens/styles.css",
  "../../packages/design/tokens/recipe.css",
  // brand-assets.ts
  "../../packages/design/brand/assets/logo/*.svg",
  // copywriting page
  "../../governance.config.json",
  // site-stats.ts workspacePackage() (develop page)
  "../../packages/design/*/package.json",
  "../../packages/ops/create-sailor/package.json",
  // showcase-source.ts readBlockSource; `*` stands in for the "(showcase)" group
  "./src/app/*/showcase/_blocks/**/*",
  // tokens/switchability page
  "./src/lib/generated/switchability.json",
];

const nextConfig: NextConfig = {
  // Env-gated, the same way apps/design-docs does it: the ECS deploy needs a
  // standalone server.js, and a Vercel build ignores the setting anyway — but
  // leaving it on unconditionally makes every local `next build` emit a
  // standalone tree nobody asked for.
  // Spread, not `output: … : undefined`. This package compiles with
  // exactOptionalPropertyTypes, where an optional property still rejects an
  // explicitly-passed undefined — so the ternary form fails to typecheck even
  // though it is what apps/design-docs uses (that package does not enable the
  // flag).
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: { "/**/*": RUNTIME_READ_FILES },
  transpilePackages: [
    "@nebutra/health",
    "@nebutra/fonts",
    "@nebutra/ui",
    "@nebutra/tokens",
    "@nebutra/icons",
    "@nebutra/design-tokens",
  ],
  turbopack: { root: monorepoRoot },
  // Catalog demos (/showcase) use next/image with Unsplash photography; without
  // this the dev overlay reports an "Invalid src prop" issue per card.
  images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }] },
  experimental: {
    optimizePackageImports: ["@nebutra/icons"],
  },
};

export default nextConfig;
