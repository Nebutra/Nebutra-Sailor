import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Standalone is for ECS/PM2 only. Vercel builds without output:"standalone".
const useStandalone =
  process.env.NEXT_OUTPUT === "standalone" ||
  (process.env.VERCEL !== "1" && process.env.NEXT_OUTPUT !== "vercel");

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  transpilePackages: [
    "@nebutra/fonts",
    "@lobehub/icons",
    "@nebutra/ai-providers",
    "@nebutra/brand",
    "@nebutra/ui",
    "@nebutra/tokens",
    "@nebutra/icons",
    "@nebutra/prepaid-wallet",
    "@nebutra/router-supply",
    "@nebutra/auth",
    "@nebutra/i18n",
  ],
  async rewrites() {
    return [{ source: "/v1/:path*", destination: "/api/v1/:path*" }];
  },
  experimental: {
    // No source maps for the server bundle — Turbopack emits them, webpack
    // does not, and nobody chose them. Measured on sailor-docs: 138 MB of maps
    // against 50 MB of server JS. They only symbolicate server stack traces and
    // never reach a browser. See apps/sailor-docs/next.config.ts.
    serverSourceMaps: false,
    optimizePackageImports: ["@nebutra/ui", "@nebutra/ui/primitives", "@nebutra/icons"],
  },
};

export default withNextIntl(nextConfig);
