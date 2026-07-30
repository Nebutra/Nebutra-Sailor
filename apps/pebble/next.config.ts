import type { NextConfig } from "next";

/**
 * Pebble brand front — static marketing + download + machine-consumed feeds.
 *
 * Product API lives on api.nebutra.com/pebble/* (ECS). This origin only
 * reverse-proxies legacy POST paths for one release cycle of desktop clients
 * that still target pebble.nebutra.com/v1/feedback (see vercel.json rewrites).
 *
 * Docs are canonical on docs.nebutra.com/pebble/*; /docs/* permanently redirects.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
