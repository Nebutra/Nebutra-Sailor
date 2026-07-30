import type { NextConfig } from "next";

/**
 * Pebble brand front — landing / download / static feeds.
 *
 * Production topology (owner choice, 2026-07-30): CF A → ECS 106.15.4.31.
 * nginx `pebble.nebutra.com` proxies here (PM2 :3017) and reverse-proxies
 * legacy POST /v1/feedback + /diagnostics/* to api-gateway `/pebble/*`.
 * Docs stay on docs.nebutra.com/pebble/* (nginx 301 from /docs/*).
 *
 * `output: "standalone"` is gated so local/Vercel builds skip the trace cost;
 * ECS deploy sets NEXT_OUTPUT=standalone.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
