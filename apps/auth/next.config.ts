import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Enables Cloudflare bindings when previewing against OpenNext Workers.
// No-op for plain `next dev` and ECS standalone production builds.
initOpenNextCloudflareForDev();

// next-intl v4 resolves this path via fs.existsSync (not Node module resolution).
// Shared cookie-mode request config lives in @nebutra/i18n.
const withNextIntl = createNextIntlPlugin("../../packages/platform/i18n/src/request.ts");

const monorepoRoot = path.join(__dirname, "../..");

// Standalone: ECS/PM2 and OpenNext Cloudflare build. Skip for pure Vercel if ever used.
const useStandalone =
  process.env.NEXT_OUTPUT === "standalone" ||
  process.env.OPEN_NEXT_BUILD === "true" ||
  (process.env.VERCEL !== "1" && process.env.NEXT_OUTPUT !== "vercel");

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  outputFileTracingRoot: monorepoRoot,
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
  typescript: {
    ignoreBuildErrors:
      process.env.OPEN_NEXT_BUILD === "true" ||
      process.env.CI === "true" ||
      process.env.NEXT_OUTPUT === "standalone",
  },
};

export default withNextIntl(nextConfig);
