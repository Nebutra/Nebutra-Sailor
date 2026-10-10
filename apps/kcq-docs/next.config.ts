import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX({ configPath: "source.config.ts", outDir: ".source" });

/**
 * A static export served by the KCQ nginx next to the product (infra/fly/kcq.nginx.conf):
 * English at /docs, Chinese at /zh/docs, the same split as the public pages (/home, /zh/home).
 * Routes are real paths (`app/(en)/docs`, `app/(zh)/zh/docs`), so there is no basePath; assets are
 * prefixed with /docs and scripts/postbuild.mjs moves `_next/` under it, so nothing the docs ship
 * lands at the site root next to the product's own files.
 */
const nextConfig: NextConfig = {
  output: "export",
  assetPrefix: "/docs",
  trailingSlash: false,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // The strict typecheck is its own gate (`pnpm --filter @nebutra/kcq-docs typecheck`).
  typescript: { ignoreBuildErrors: true },
  experimental: {
    optimizePackageImports: ["fumadocs-ui", "fumadocs-core"],
  },
};

export default withMDX(nextConfig);
