import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@nebutra/auth",
    "@nebutra/brand",
    "@nebutra/db",
    "@nebutra/logger",
    "@nebutra/tokens",
    "@nebutra/ui",
  ],
};

export default nextConfig;
