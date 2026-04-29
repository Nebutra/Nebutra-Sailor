import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  // Required for self-hosted ECS deployments.
  // Builds a minimal server bundle under .next/standalone so the 2C4G origin
  // only runs the app instead of compiling Next.js in production.
  output: "standalone",
  serverExternalPackages: ["@takumi-rs/image-response"],
  transpilePackages: [
    "@nebutra/ui",
    "@nebutra/tokens",
    "fumadocs-ui",
    "fumadocs-core",
    "fumadocs-mdx",
    "@fumadocs/story",
  ],
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/sailor/getting-started",
        destination: "/docs/getting-started/installation",
        permanent: true,
      },
      {
        source: "/docs/whitelabel",
        destination: "/docs/customization/overview",
        permanent: true,
      },
      {
        source: "/en/docs/whitelabel",
        destination: "/docs/customization/overview",
        permanent: true,
      },
      {
        source: "/zh/docs/whitelabel",
        destination: "/zh/docs/customization/overview",
        permanent: true,
      },
      {
        source: "/docs/billing",
        destination: "/docs/payments/overview",
        permanent: true,
      },
      {
        source: "/docs/authentication",
        destination: "/docs/guides/authentication",
        permanent: true,
      },
      {
        source: "/docs/multi-tenancy",
        destination: "/docs/guides/multi-tenancy",
        permanent: true,
      },
      {
        source: "/docs/ai-integrations",
        destination: "/docs/ai/overview",
        permanent: true,
      },
      {
        source: "/docs/integrations",
        destination: "/docs/integrations/overview",
        permanent: true,
      },
      {
        source: "/docs/infrastructure",
        destination: "/docs/deployment/overview",
        permanent: true,
      },
      {
        source: "/docs/monorepo",
        destination: "/docs/development/project-structure",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/docs/:path*",
      },
      {
        source: "/zh/docs/:path*.mdx",
        destination: "/llms.mdx/docs/:path*",
      },
      {
        source: "/en/docs/:path*.mdx",
        destination: "/llms.mdx/docs/:path*",
      },
    ];
  },
};

export default withMDX(nextConfig);
