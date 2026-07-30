import createBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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
    ]),
    cspDirective("font-src", ["'self'", "data:"]),
    cspDirective("media-src", ["'self'", "https://d8j0ntlcm91z4.cloudfront.net"]),
    cspDirective("connect-src", ["'self'", googleIdentityServices.connect]),
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
    // Align with CSP frame-ancestors 'none', proxy.ts DENY, and vercel.json DENY.
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
  allowedDevOrigins: ["127.0.0.1"],

  // `output: "standalone"` is gated by env so Vercel builds (which ignore it)
  // skip the standalone trace cost, while Docker / ECS deploys can opt in by
  // setting NEXT_OUTPUT=standalone. The ECS workflow at .github/workflows/
  // deploy-ecs.yml relies on .next/standalone/ existing.
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
    viewTransition: true,
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
      "@nebutra/icons",
      "@nebutra/brand",
    ],
  },

  // Vercel should produce the deployable artifact quickly; type checking stays
  // a separate validation gate via `pnpm --filter @nebutra/landing typecheck`.
  typescript: {
    ignoreBuildErrors: process.env.VERCEL === "1",
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
    ],
  },
};

const config = withNextIntl(nextConfig);

export default process.env.ANALYZE === "true" ? withBundleAnalyzer(config) : config;
