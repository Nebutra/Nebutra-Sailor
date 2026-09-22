import { brand } from "@nebutra/brand/metadata";
import type { NextConfig } from "next";

// Standalone is the only shape that ships (Fly Machines, ECS rollback). The
// Vercel opt-out was retired with the Vercel deploy surface on 2026-09-22;
// NEXT_OUTPUT=standalone stays honoured for callers that set it explicitly.
const useStandalone = process.env.NEXT_OUTPUT !== "vercel";

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  transpilePackages: [
    "@nebutra/health",
    "@nebutra/auth",
    "@nebutra/billing",
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
