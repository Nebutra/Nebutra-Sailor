import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl v4 resolves this path via fs.existsSync (not Node module resolution),
// so we must use a relative filesystem path, not a bare package specifier.
const withNextIntl = createNextIntlPlugin("../../packages/i18n/src/request.ts");

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Security headers applied to every route in the authenticated dashboard.
// The dashboard uses stricter values than the landing page (e.g. X-Frame-Options
// is DENY rather than SAMEORIGIN).
//
// NOTE: Content-Security-Policy is NOT listed here — it is set dynamically by
// the middleware (src/middleware.ts) with a per-request nonce so that we can
// avoid 'unsafe-inline' for scripts and styles.
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Prevent the dashboard from being embedded in any frame.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Required for Docker / self-hosted deployments.
  // Produces a minimal standalone server bundle under .next/standalone.
  output: "standalone",

  // Keep Prisma and bcryptjs out of the client bundle — they are Node-only.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "bcryptjs"],

  // Workspace packages: src/-exporting packages need this for SWC to process
  // TypeScript; dist/-exporting packages need it for "use client" detection.
  transpilePackages: ["@nebutra/ui", "@nebutra/tokens", "@nebutra/auth"],

  reactCompiler: true,

  // Allow Next.js Image to load from external sources used by this app.
  // Add new hostnames here rather than disabling optimization globally.
  images: {
    remotePatterns: [
      // Clerk user profile avatars
      { protocol: "https", hostname: "**.clerk.com" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.com" },
      // OAuth provider avatars
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "**.gravatar.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      // Nebutra CDN
      { protocol: "https", hostname: "cdn.nebutra.com" },
    ],
  },

  // Attach security headers to every route.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
