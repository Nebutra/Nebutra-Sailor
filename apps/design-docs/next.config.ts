import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
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
