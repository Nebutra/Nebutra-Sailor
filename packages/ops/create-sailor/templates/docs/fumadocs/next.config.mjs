import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@nebutra/ui",
    "@nebutra/tokens",
    "fumadocs-ui",
    "fumadocs-core",
    "fumadocs-mdx",
  ],
};

export default withMDX(nextConfig);
