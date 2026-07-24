import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@nebutra/brand",
    "@nebutra/ui",
    "@nebutra/tokens",
    "@nebutra/icons",
    "@nebutra/typelens-catalog",
  ],
};
export default nextConfig;
