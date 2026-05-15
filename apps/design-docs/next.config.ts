import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX({
  configPath: "source.config.ts",
  outDir: ".source",
});

const nextConfig: NextConfig = {
  // `output: "standalone"` is gated by env so Vercel builds (which ignore it)
  // skip the standalone trace cost, while Docker / ECS deploys can opt in by
  // setting NEXT_OUTPUT=standalone. The ECS workflow at .github/workflows/
  // deploy-ecs.yml relies on .next/standalone/ existing.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,

  // Skip in-build tsc on production deploys — strict typecheck runs as a
  // separate lefthook job. Mirrors sailor-docs; needed because demo files
  // under src/components/previews/ are also published as registry sources
  // and exercise tsc inside next-build even when not rendered.
  typescript: {
    ignoreBuildErrors: process.env.NEXT_OUTPUT === "standalone",
  },

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
  // Remote image hosts referenced by demos.
  // Unsplash removed — demos use local SVG data URLs (avoid Fake-IP DNS proxy
  // issues + Next SSRF protection + CDN flakiness).
  images: {
    remotePatterns: [
      // Avatar / user icon demos still legitimately use these GitHub-family hosts.
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "gitlab.com" },
      { protocol: "https", hostname: "bitbucket.org" },
      { protocol: "https", hostname: "nebutra.com" },
      { protocol: "https", hostname: "www.w3schools.com" },
    ],
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
