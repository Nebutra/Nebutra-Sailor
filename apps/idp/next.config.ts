import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // No source maps for the server bundle — Turbopack emits them, webpack does
    // not, and nobody chose them. Measured on sailor-docs: 138 MB of maps
    // against 50 MB of server JS. They only symbolicate server stack traces and
    // never reach a browser. See apps/sailor-docs/next.config.ts.
    serverSourceMaps: false,
  },
  // Required for the multi-stage Docker image (apps/idp/Dockerfile)
  output: "standalone",

  // Transpile workspace packages
  transpilePackages: [
    "@nebutra/oauth",
    "@nebutra/contracts",
    "@nebutra/db",
    "@nebutra/tokens",
    "@nebutra/ui",
    "@nebutra/vault",
  ],
};

export default nextConfig;
