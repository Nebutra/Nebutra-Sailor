import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Standalone is for ECS/PM2 only. Vercel builds without output:"standalone".
const useStandalone =
  process.env.NEXT_OUTPUT === "standalone" ||
  (process.env.VERCEL !== "1" && process.env.NEXT_OUTPUT !== "vercel");

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  // Hard-correct: md-to-pdf dynamically imports Playwright. Keep it external so
  // the Node runtime can resolve the package from standalone node_modules
  // (and so browser binaries are installable next to the release).
  serverExternalPackages: ["playwright", "playwright-core", "sharp"],
  transpilePackages: [
    "@nebutra/fonts",
    "@nebutra/auth",
    "@nebutra/billing",
    "@nebutra/brand",
    "@nebutra/ui",
    "@nebutra/tokens",
    "@nebutra/icons",
    "@nebutra/forge-runtime",
    "@nebutra/prepaid-wallet",
    "@nebutra/i18n",
  ],
  experimental: {
    optimizePackageImports: ["@nebutra/ui", "@nebutra/ui/primitives", "@nebutra/icons"],
  },
};

export default withNextIntl(nextConfig);
