import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Nebutra Status ships as one standalone server in one Docker image: the
 * public pages, the API and the in-process monitors run together.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@nebutra/fonts",
    "@nebutra/icons",
    "@nebutra/status",
    "@nebutra/tokens",
    "@nebutra/ui",
  ],
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
  poweredByHeader: false,
  experimental: {
    serverSourceMaps: false,
    optimizePackageImports: ["@nebutra/ui", "@nebutra/ui/primitives", "@nebutra/icons"],
  },
};

export default withNextIntl(nextConfig);
