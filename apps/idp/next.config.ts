import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the multi-stage Docker image (apps/idp/Dockerfile)
  output: "standalone",

  // Transpile workspace packages
  transpilePackages: [
    "@nebutra/oauth-server",
    "@nebutra/contracts",
    "@nebutra/db",
    "@nebutra/tokens",
    "@nebutra/ui",
  ],
};

export default nextConfig;
