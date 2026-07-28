import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "../..");

// Ships as a Next standalone server on the ECS origin (PM2 `admin`, :3108).
// Unlike the public apps there is no Cloudflare Worker build — the control
// plane sits behind Cloudflare Access, not on the edge.
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: [
    "@nebutra/brand",
    "@nebutra/ui",
    "@nebutra/tokens",
    "@nebutra/icons",
    "@nebutra/permissions",
    "@nebutra/preset",
  ],
  turbopack: {
    root: monorepoRoot,
  },
  experimental: {
    optimizePackageImports: ["@nebutra/icons"],
  },
  // Internal surface — never indexed, never framed.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
