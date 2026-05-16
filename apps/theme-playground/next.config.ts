import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@nebutra/design-tokens",
    "@nebutra/icons",
    "@nebutra/theme",
    "@nebutra/tokens",
    "@nebutra/ui",
  ],
};

export default nextConfig;
