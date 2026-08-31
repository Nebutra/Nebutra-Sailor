import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@nebutra/storage"],
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.nebutra.com", pathname: "/kuanlan/**" },
      { protocol: "https", hostname: "**.r2.dev", pathname: "/kuanlan/**" },
    ],
  },
};

export default nextConfig;
