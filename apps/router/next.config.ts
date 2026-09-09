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
    "@nebutra/health",
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
    "@nebutra/repositories",
    "@nebutra/contracts",
    "@nebutra/audit",
    "@nebutra/billing",
    "@nebutra/rate-limit",
  ],
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
  async rewrites() {
    // The public, key-authenticated relay only. `/api/v1/[...path]` answers 404
    // for anything outside its allow-list, so this rewrite cannot expose a
    // console route: the console lives under `/api/console/v1/*`, which no
    // `/v1/...` URL can reach. It used to sit under `/api/v1/*`, where
    // `/v1/wallet/topup` was an unauthenticated public mutation.
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
