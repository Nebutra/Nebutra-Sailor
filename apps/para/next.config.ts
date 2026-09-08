import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: [
    "@nebutra/fonts",
    "@nebutra/brand",
    "@nebutra/ui",
    "@nebutra/tokens",
    "@nebutra/icons",
  ],
  turbopack: { root: monorepoRoot },
  experimental: { optimizePackageImports: ["@nebutra/icons"] },
};

export default nextConfig;
