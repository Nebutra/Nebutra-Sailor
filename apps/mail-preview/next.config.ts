import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Workspace packages — must be transpiled by SWC
  transpilePackages: ["@nebutra/email", "@nebutra/ui", "@nebutra/tokens"],

  // Internal dev tool — keep build forgiving so iterating on templates
  // never blocks running the previewer.
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
