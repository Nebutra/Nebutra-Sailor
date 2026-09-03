import { brand } from "@nebutra/brand/metadata";
import type { NextConfig } from "next";

const useStandalone =
  process.env.NEXT_OUTPUT === "standalone" ||
  (process.env.VERCEL !== "1" && process.env.NEXT_OUTPUT !== "vercel");

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  transpilePackages: [
    "@nebutra/auth",
    "@nebutra/brand",
    "@nebutra/fonts",
    "@nebutra/rate-limit",
    "@nebutra/storage",
  ],
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: brand.domains.cdn, pathname: "/kuanlan/**" },
      { protocol: "https", hostname: "**.r2.dev", pathname: "/kuanlan/**" },
    ],
  },
};

export default nextConfig;
