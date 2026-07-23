import type { NextConfig } from "next";

// Standalone is for ECS/PM2 only. Vercel builds without output:"standalone".
const useStandalone =
  process.env.NEXT_OUTPUT === "standalone" ||
  (process.env.VERCEL !== "1" && process.env.NEXT_OUTPUT !== "vercel");

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  transpilePackages: [
    "@nebutra/auth",
    "@nebutra/brand",
    "@nebutra/db",
    "@nebutra/icons",
    "@nebutra/logger",
    "@nebutra/tokens",
    "@nebutra/ui",
  ],
  experimental: {
    // Keep client graph small; mirrors apps/web for design-system packages.
    optimizePackageImports: ["@nebutra/ui", "@nebutra/ui/primitives", "@nebutra/icons"],
  },
};

export default nextConfig;
