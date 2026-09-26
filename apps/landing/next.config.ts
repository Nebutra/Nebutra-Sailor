import { getBrandOrigin, publicAssetOrigin } from "@nebutra/brand/metadata-helpers";
import createBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const cdnOrigin = getBrandOrigin("cdn");
const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? getBrandOrigin("api")).replace(/\/$/, "");
const pebbleOrigin = getBrandOrigin("pebble");
const landingHost = new URL(getBrandOrigin("landing")).host;

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withBundleAnalyzer = createBundleAnalyzer({ enabled: true });
const isDevelopment = process.env.NODE_ENV !== "production";
const googleIdentityServices = {
  connect: "https://accounts.google.com/gsi/",
  frame: "https://accounts.google.com/gsi/",
  script: "https://accounts.google.com/gsi/client",
  style: "https://accounts.google.com/gsi/style",
} as const;

function cspDirective(name: string, sources: readonly string[]): string {
  return `${name} ${sources.join(" ")}`;
}

function originFromUrl(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/** App / auth hosts the navbar session probe and sign-out hop talk to. */
function firstPartyConnectOrigins(): string[] {
  const origins = new Set<string>();
  for (const raw of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_AUTH_URL,
    getBrandOrigin("app"),
    getBrandOrigin("auth"),
  ]) {
    const origin = originFromUrl(raw);
    if (origin) origins.add(origin);
  }
  return [...origins].sort();
}

function buildContentSecurityPolicy(): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    googleIdentityServices.script,
  ];

  return [
    cspDirective("default-src", ["'self'"]),
    cspDirective("script-src", scriptSrc),
    cspDirective("style-src", ["'self'", "'unsafe-inline'", googleIdentityServices.style]),
    cspDirective("img-src", [
      "'self'",
      "data:",
      "blob:",
      "https://svgl.app",
      "https://cdn.simpleicons.org",
      "https://github.com",
      "https://images.unsplash.com",
      "https://avatars.githubusercontent.com",
      "https://api.dicebear.com",
      // OAuth profile photos (navbar avatar). Google Gmail photos live on
      // lh*.googleusercontent.com — without this host the <img> is blocked
      // and the header shows the broken-image glyph.
      "https://*.googleusercontent.com",
      "https://*.gravatar.com",
      "https://*.clerk.com",
      "https://img.clerk.com",
      "https://images.clerk.com",
      "https://ui-avatars.com",
      cdnOrigin,
    ]),
    // MiSans is served from the public asset origin (<CjkFontFace />).
    cspDirective("font-src", ["'self'", "data:", publicAssetOrigin()]),
    cspDirective("media-src", ["'self'", "https://d8j0ntlcm91z4.cloudfront.net"]),
    cspDirective("connect-src", [
      "'self'",
      ...firstPartyConnectOrigins(),
      googleIdentityServices.connect,
      cdnOrigin,
    ]),
    cspDirective("frame-src", [googleIdentityServices.frame]),
    cspDirective("frame-ancestors", ["'none'"]),
  ].join("; ");
}

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    // Align with CSP frame-ancestors 'none' and proxy.ts DENY.
    // SAMEORIGIN here previously conflicted with edge/proxy DENY (visibility G35).
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(),
  },
];

const nextConfig: NextConfig = {
  /**
   * `/sitemap.xml` is the URL robots.txt advertises and Search Console has on
   * record, but the file that serves it cannot live at that path: `sitemap.ts`
   * uses `generateSitemaps`, and Next's conflict detector claims
   * `/sitemap.xml/route` for the metadata file even though the router then
   * 404s it (the shards are served at `/sitemap/<locale>.xml`). Having both
   * refuses to build. So the index lives at `/sitemap-index.xml` and this
   * rewrite keeps the public URL working.
   *
   * The `/api/*` proxy to the gateway is a *fallback* rewrite: the app's own
   * route handlers (newsletter, waitlist, license, feeds, og) win, and only
   * paths this app does not serve reach the gateway. It used to live in
   * vercel.json, where Vercel applied it after the filesystem for the same
   * reason.
   */
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [{ source: "/sitemap.xml", destination: "/sitemap-index.xml" }],
      fallback: [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }],
    };
  },

  /**
   * The Pebble brand front lives on its own host; `/pebble` was a section of
   * this site before the split. www canonicalises onto the apex so the two
   * names do not serve the same page. Both moved here from vercel.json when
   * the site left Vercel.
   */
  async redirects() {
    return [
      {
        source: "/pebble",
        destination: pebbleOrigin,
        permanent: true,
      },
      {
        source: "/pebble/:path*",
        destination: `${pebbleOrigin}/:path*`,
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${landingHost}` }],
        destination: `${getBrandOrigin("landing")}/:path*`,
        permanent: true,
      },
    ];
  },

  allowedDevOrigins: ["127.0.0.1"],

  // `output: "standalone"` is gated by env: the Fly Machine and the ECS
  // rollback path both set NEXT_OUTPUT=standalone (deploy-fly.yml /
  // deploy-ecs.yml), while `next dev` and local `next build` skip the
  // standalone trace cost.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,

  // Prune build-time-only native toolchains from the standalone runtime trace.
  // Next's output-file-tracing was pulling @swc/core (~226MB of platform
  // binaries, dragged in by reactCompiler/SWC) and esbuild into
  // .next/standalone/node_modules, even though `node server.js` never loads
  // them at runtime. That bloat is what broke the ECS scp upload (issue #141).
  // NOTE: `sharp` is intentionally NOT excluded — it is loaded at runtime by
  // next/image optimization; the host-arch binary must stay in the trace.
  outputFileTracingExcludes: {
    "*": ["**/@swc/core/**", "**/@swc/core-*/**", "**/@esbuild/**", "**/esbuild/**"],
  },

  // Enable Partial Prerendering — Next.js 16 merged experimental.ppr into cacheComponents.
  cacheComponents: true,
  experimental: {
    // `viewTransition` graduated out of experimental in Next 16.3 — the key no
    // longer exists on ExperimentalConfig, so setting it is a type error and
    // does nothing. React's view transitions are on without it.
    webpackBuildWorker: true,
    webpackMemoryOptimizations: true,
    // Rewrite barrel imports of the dist-published internal packages into direct
    // per-module imports so webpack's build-time module graph stays small.
    // Without this, 170+ files each pull the full ~1MB @nebutra/ui/primitives
    // barrel (and the ~382KB canonical chunk) into the graph, which exhausts the
    // build container on a cold webpack build (the SIGKILL/OOM on the 8GB runner).
    optimizePackageImports: [
      "@nebutra/ui",
      "@nebutra/ui/primitives",
      "@nebutra/ui/components",
      "@nebutra/ui/editorial",
      "@nebutra/icons",
      "@nebutra/brand",
    ],
  },

  // Only workspace packages that still export raw `src/` need transpilation.
  // ui/marketing/sanity/brand/icons publish proper `dist/` (esm + d.ts) and
  // resolve via package exports — keeping them here would force SWC + React
  // Compiler to walk the entire workspace src tree on every build.
  transpilePackages: [
    "@nebutra/fonts",
    "@nebutra/agents",
    "@nebutra/auth",
    "@nebutra/billing",
    "@nebutra/blog",
    "@nebutra/db",
    "@nebutra/identity",
    "@nebutra/license",
    "@nebutra/logger",
    "@nebutra/metering",
    "@nebutra/queue",
    "@nebutra/rls",
    "@nebutra/tokens",
    "@nebutra/vault",
    "@nebutra/waitlist",
  ],
  reactCompiler: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // API answers are per-session/per-request; never let a CDN hold them.
        // Moved from vercel.json when the site left Vercel.
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "svgl.app", pathname: "/library/**" },
      { protocol: "https", hostname: "cdn.simpleicons.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },
      // DiceBear avatars used in Waitlist social proof
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: new URL(cdnOrigin).hostname },
    ],
  },
};

const config = withNextIntl(nextConfig);

export default process.env.ANALYZE === "true" ? withBundleAnalyzer(config) : config;
