import createBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withBundleAnalyzer = createBundleAnalyzer({ enabled: true });

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://svgl.app https://cdn.simpleicons.org https://github.com https://images.unsplash.com https://avatars.githubusercontent.com https://api.dicebear.com; font-src 'self' data:; media-src 'self' https://d8j0ntlcm91z4.cloudfront.net; connect-src 'self'; frame-ancestors 'none';",
  },
];

const nextConfig: NextConfig = {
  // `output: "standalone"` is gated by env so Vercel builds (which ignore it)
  // skip the standalone trace cost, while Docker / ECS deploys can opt in by
  // setting NEXT_OUTPUT=standalone. The ECS workflow at .github/workflows/
  // deploy-ecs.yml relies on .next/standalone/ existing.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,

  // Enable Partial Prerendering — Next.js 16 merged experimental.ppr into cacheComponents.
  cacheComponents: true,
  experimental: {
    webpackBuildWorker: true,
    webpackMemoryOptimizations: true,
  },

  // Vercel should produce the deployable artifact quickly; type checking stays
  // a separate validation gate via `pnpm --filter @nebutra/landing-page typecheck`.
  typescript: {
    ignoreBuildErrors: process.env.VERCEL === "1",
  },

  // Only workspace packages that still export raw `src/` need transpilation.
  // ui/marketing/sanity/brand/icons publish proper `dist/` (esm + d.ts) and
  // resolve via package exports — keeping them here would force SWC + React
  // Compiler to walk the entire workspace src tree on every build.
  transpilePackages: [
    "@nebutra/agents",
    "@nebutra/auth",
    "@nebutra/billing",
    "@nebutra/db",
    "@nebutra/identity",
    "@nebutra/license",
    "@nebutra/logger",
    "@nebutra/metering",
    "@nebutra/queue",
    "@nebutra/rls",
    "@nebutra/tokens",
  ],
  reactCompiler: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "svgl.app", pathname: "/library/**" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },
      // DiceBear avatars used in Waitlist social proof
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
};

const config = withNextIntl(nextConfig);

export default process.env.ANALYZE === "true" ? withBundleAnalyzer(config) : config;
