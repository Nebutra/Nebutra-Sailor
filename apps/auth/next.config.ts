import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl v4 resolves this path via fs.existsSync (not Node module resolution).
// Shared cookie-mode request config lives in @nebutra/i18n.
const withNextIntl = createNextIntlPlugin("../../packages/platform/i18n/src/request.ts");

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
    "@nebutra/i18n",
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

export default withNextIntl(nextConfig);
