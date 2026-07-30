import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
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
