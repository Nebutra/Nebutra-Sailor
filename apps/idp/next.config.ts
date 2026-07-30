import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the multi-stage Docker image (apps/idp/Dockerfile)
  output: "standalone",

  // Transpile workspace packages
  transpilePackages: [
    "@nebutra/oauth",
    "@nebutra/contracts",
    "@nebutra/db",
    "@nebutra/tokens",
    "@nebutra/ui",
    "@nebutra/vault",
  ],
};

export default nextConfig;
