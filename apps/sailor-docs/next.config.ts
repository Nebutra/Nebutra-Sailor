import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  // Required for self-hosted ECS deployments.
  // Builds a minimal server bundle under .next/standalone so the 2C4G origin
  // only runs the app instead of compiling Next.js in production.
  output: "standalone",
  // Skip in-build tsc on production deploys — the strict typecheck runs as
  // its own pre-push lefthook job (`pnpm --filter @nebutra/sailor-docs
  // typecheck`), so the build pipeline doesn't need to redo it. Without
  // this, transient type drift in demo components (`previews/*`) — which
  // get republished as shadcn-registry source and are exercised by tsc but
  // never actually rendered into a layout — keeps blocking ECS deploys.
  typescript: {
    ignoreBuildErrors: process.env.NEXT_OUTPUT === "standalone",
  },
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
  // Clean-subdomain URL scheme (docs.nebutra.com/<lang>/<slug>). Old
  // `/docs/...` and `/<lang>/docs/...` URLs are 301'd to the new paths so
  // external links keep working. Host root `/` is redirected to default lang.
  async redirects() {
    const backCompat = (slug: string) => [
      // pre-i18n shape — assume English when no locale was specified
      { source: `/docs/${slug}`, destination: `/en/${slug}`, permanent: true as const },
      // legacy /<lang>/docs/<slug> → /<lang>/<slug>
      { source: `/en/docs/${slug}`, destination: `/en/${slug}`, permanent: true as const },
      { source: `/zh/docs/${slug}`, destination: `/zh/${slug}`, permanent: true as const },
    ];

    return [
      // Host root → default language
      { source: "/", destination: "/en", permanent: false },

      // Catch-all back-compat from the old /docs prefix (both pre-i18n and
      // post-i18n shapes). Permanent so caches + search engines update.
      {
        source: "/docs/:path*",
        destination: "/en/:path*",
        permanent: true,
      },
      {
        source: "/:lang(en|zh)/docs/:path*",
        destination: "/:lang/:path*",
        permanent: true,
      },

      // Renamed pages — translated from the old `/docs/*` shape into the new
      // clean shape. Listed explicitly because each one redirects across a
      // taxonomy change (not just a prefix strip).
      {
        source: "/sailor/getting-started",
        destination: "/en/getting-started/installation",
        permanent: true,
      },
      ...backCompat("whitelabel").map((r) => ({
        ...r,
        destination: r.destination.replace(/\/whitelabel$/, "/customization/overview"),
      })),
      ...backCompat("billing").map((r) => ({
        ...r,
        destination: r.destination.replace(/\/billing$/, "/payments/overview"),
      })),
      ...backCompat("authentication").map((r) => ({
        ...r,
        destination: r.destination.replace(/\/authentication$/, "/guides/authentication"),
      })),
      ...backCompat("multi-tenancy").map((r) => ({
        ...r,
        destination: r.destination.replace(/\/multi-tenancy$/, "/guides/multi-tenancy"),
      })),
      ...backCompat("ai-integrations").map((r) => ({
        ...r,
        destination: r.destination.replace(/\/ai-integrations$/, "/ai/overview"),
      })),
      ...backCompat("integrations").map((r) => ({
        ...r,
        destination: r.destination.replace(/\/integrations$/, "/integrations/overview"),
      })),
      ...backCompat("infrastructure").map((r) => ({
        ...r,
        destination: r.destination.replace(/\/infrastructure$/, "/deployment/overview"),
      })),
      ...backCompat("monorepo").map((r) => ({
        ...r,
        destination: r.destination.replace(/\/monorepo$/, "/development/project-structure"),
      })),
    ];
  },
  // `<lang>/<slug>.mdx` returns the raw Markdown via the llms.mdx internal API.
  // The internal API path keeps its `docs/` segment — it is not a user-visible
  // URL, just the underlying handler at app/llms.mdx/docs/[[...slug]]/route.tsx.
  async rewrites() {
    return [
      {
        source: "/:lang(en|zh)/:path*.mdx",
        destination: "/llms.mdx/docs/:path*",
      },
    ];
  },
};

export default withMDX(nextConfig);
