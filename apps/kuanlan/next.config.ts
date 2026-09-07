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
    "@nebutra/db",
    "@nebutra/fonts",
    "@nebutra/logger",
    "@nebutra/rate-limit",
    "@nebutra/storage",
  ],
  // Prisma and its pg driver adapter are Node-only; keep them out of the
  // client bundle and let output-file tracing carry them as externals — the
  // same recipe apps/web ships to Fly with.
  serverExternalPackages: ["sharp", "@prisma/client", "@prisma/adapter-pg", "pg"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: brand.domains.cdn, pathname: "/kuanlan/**" },
      { protocol: "https", hostname: "**.r2.dev", pathname: "/kuanlan/**" },
    ],
  },
};

export default nextConfig;
