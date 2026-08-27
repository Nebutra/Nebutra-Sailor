import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "../..");

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
  transpilePackages: [
    "@nebutra/fonts",
    "@nebutra/ui",
    "@nebutra/tokens",
    "@nebutra/icons",
    "@nebutra/design-tokens",
  ],
  turbopack: { root: monorepoRoot },
  experimental: {
    optimizePackageImports: ["@nebutra/icons"],
  },
};

export default nextConfig;
