import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

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
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://svgl.app https://cdn.simpleicons.org https://github.com https://images.unsplash.com https://avatars.githubusercontent.com; font-src 'self' data:; media-src 'self' https://d8j0ntlcm91z4.cloudfront.net; connect-src 'self'; frame-ancestors 'none';",
  },
];

const nextConfig: NextConfig = {
  // Required for Docker / self-hosted deployments.
  // Produces a minimal standalone server bundle under .next/standalone.
  output: "standalone",

  // Enable Partial Prerendering — Next.js 16 merged experimental.ppr into cacheComponents.
  cacheComponents: true,

  // Vercel should produce the deployable artifact quickly; type checking stays
  // a separate validation gate via `pnpm --filter @nebutra/landing-page typecheck`.
  typescript: {
    ignoreBuildErrors: process.env.VERCEL === "1",
  },

  // Workspace packages: src/-exporting packages need this for SWC to process
  // TypeScript; dist/-exporting packages need it for "use client" detection.
  transpilePackages: [
    "@nebutra/brand",
    "@nebutra/ui",
    "@nebutra/tokens",
    "@nebutra/marketing",
    "@nebutra/sanity",
    "@nebutra/logger",
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
      // DiceBear avatars used in Waitlist social proof
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
