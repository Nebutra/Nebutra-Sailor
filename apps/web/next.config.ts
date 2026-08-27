import { brand } from "@nebutra/brand/metadata";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl v4 resolves this path via fs.existsSync (not Node module resolution),
// so we must use a relative filesystem path, not a bare package specifier.
const withNextIntl = createNextIntlPlugin("../../packages/platform/i18n/src/request.ts");

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Security headers applied to every route in the authenticated dashboard.
// X-Frame-Options is DENY across apps (aligned with CSP frame-ancestors 'none').
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

  // Next.js 16 cross-origin protection — without this, accessing dev server
  // from a non-localhost origin (LAN IP, ngrok, codespaces) silently blocks
  // HMR client + Server Action calls, leaving React event handlers unbound
  // (page renders but clicks do nothing). Whitelist private network ranges
  // for dev, plus any tunnels the team commonly uses.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "*.local",
    "*.ngrok.io",
    "*.ngrok-free.app",
  ],

  // Keep Prisma and bcryptjs out of the client bundle — they are Node-only.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "bcryptjs"],

  // Workspace packages: src/-exporting packages need this for SWC to process
  // TypeScript; dist/-exporting packages need it for "use client" detection.
  transpilePackages: [
    "@nebutra/agents",
    "@nebutra/auth",
    "@nebutra/billing",
    "@nebutra/china-compliance",
    "@nebutra/db",
    "@nebutra/design-tokens",
    "@nebutra/feature-flags",
    "@nebutra/fonts",
    "@nebutra/i18n",
    "@nebutra/icons",
    "@nebutra/logger",
    "@nebutra/notifications",
    "@nebutra/queue",
    "@nebutra/theme",
    "@nebutra/tokens",
    "@nebutra/ui",
    "@nebutra/uploads",
    "@nebutra/vault",
    "@nebutra/webhooks",
  ],

  reactCompiler: true,

  // Rewrite barrel imports of the heavy internal UI/icon/brand packages into
  // direct per-module imports so the build-time module graph stays small (80+
  // files import the ~1MB @nebutra/ui/primitives barrel). Mirrors the
  // landing config; keeps the dashboard build off the compile-phase OOM
  // pattern. Non-breaking: Next falls back to the barrel for any package it
  // cannot statically analyse.
  experimental: {
    // No source maps for the server bundle — Turbopack emits them, webpack
    // does not, and nobody chose them. Measured on sailor-docs: 138 MB of maps
    // against 50 MB of server JS. They only symbolicate server stack traces and
    // never reach a browser. See apps/sailor-docs/next.config.ts.
    serverSourceMaps: false,
    optimizePackageImports: [
      "@nebutra/ui",
      "@nebutra/ui/primitives",
      "@nebutra/ui/components",
      "@nebutra/icons",
      "@nebutra/brand",
    ],
  },

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
      // Brand CDN
      { protocol: "https", hostname: brand.domains.cdn },
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

// Sentry webpack plugin — only enabled when an auth token is provided so that
// local dev and zero-config deployments don't fail at build time. Sourcemaps
// are uploaded to Sentry only in CI environments where SENTRY_AUTH_TOKEN is set.
const withSentry = (config: NextConfig): NextConfig => {
  if (!process.env.SENTRY_AUTH_TOKEN) {
    return config;
  }
  return withSentryConfig(config, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    disableLogger: true,
    automaticVercelMonitors: false,
  });
};

export default withSentry(withBundleAnalyzer(withNextIntl(nextConfig)));
