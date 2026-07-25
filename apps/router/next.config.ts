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
  experimental: {
    optimizePackageImports: ["@nebutra/ui", "@nebutra/ui/primitives", "@nebutra/icons"],
  },
};

export default withNextIntl(nextConfig);
