import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

// Enables Cloudflare bindings when previewing against the OpenNext Workers
// runtime. No-op for plain `next dev` and standard production builds.
initOpenNextCloudflareForDev();

const monorepoRoot = path.join(__dirname, "../..");

// OpenNext Cloudflare consumes Next standalone output during
// `opennextjs-cloudflare build`. Keep standalone on unless pure static export.
const useStandalone =
  process.env.NEXT_OUTPUT !== "export" && process.env.TYPELENS_OUTPUT !== "export";

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: [
    "@nebutra/fonts",
    "@nebutra/brand",
    "@nebutra/ui",
    "@nebutra/tokens",
    "@nebutra/icons",
    "@nebutra/typelens-catalog",
  ],
  turbopack: {
    root: monorepoRoot,
  },
  experimental: {
    optimizePackageImports: ["@nebutra/icons"],
  },
  typescript: {
    ignoreBuildErrors:
      process.env.OPEN_NEXT_BUILD === "true" ||
      process.env.CI === "true" ||
      process.env.NEXT_OUTPUT === "standalone",
  },
};

export default nextConfig;
