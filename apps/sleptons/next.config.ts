import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@nebutra/fonts", "@nebutra/ui", "@nebutra/tokens", "@nebutra/icons"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
