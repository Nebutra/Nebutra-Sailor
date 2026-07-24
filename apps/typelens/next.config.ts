import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  // pnpm monorepo: trace files from repo root (Vercel + local)
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: [
    "@nebutra/brand",
    "@nebutra/ui",
    "@nebutra/tokens",
    "@nebutra/icons",
    "@nebutra/typelens-catalog",
  ],
  turbopack: {
    root: monorepoRoot,
  },
  experimental: {
    optimizePackageImports: ["@nebutra/icons"],
  },
};

export default nextConfig;
