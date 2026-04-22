import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us-assets.i.posthog.com https://us.i.posthog.com https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://api.dicebear.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://cdn.simpleicons.org https://*.public.blob.vercel-storage.com https://images.unsplash.com",
      "font-src 'self'",
      "connect-src 'self' https://api.anthropic.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.langfuse.com https://accounts.google.com https://connect.linux.do",
      "frame-src https://accounts.google.com",
      "form-action 'self' https://github.com https://accounts.google.com https://connect.linux.do",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],

  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },

  transpilePackages: [
    "@nebutra/agents",
    "@nebutra/brand",
    "@nebutra/cache",
    "@nebutra/marketing",
    "@nebutra/tokens",
    "@nebutra/ui",
  ],

  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
};

const withMDX = createMDX();

export default withNextIntl(withMDX(nextConfig));
