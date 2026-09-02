import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { brand } from "@nebutra/brand/metadata";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

// Enables Cloudflare bindings when running `next dev` against the OpenNext
// Workers runtime. No-op for plain local Next and production builds.
initOpenNextCloudflareForDev();

const withMDX = createMDX({
  configPath: "source.config.ts",
  outDir: ".source",
});

// ECS self-host still uses Next standalone. OpenNext Cloudflare also consumes
// the standalone output during `opennextjs-cloudflare build`, so keep it on
// for both targets. Pure static export is not supported (search/chat/OG).
const useStandalone =
  process.env.NEXT_OUTPUT !== "export" && process.env.SAILOR_DOCS_OUTPUT !== "export";

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  // Skip in-build tsc on production deploys — the strict typecheck runs as
  // its own pre-push lefthook job (`pnpm --filter @nebutra/sailor-docs
  // typecheck`), so the build pipeline doesn't need to redo it. Without
  // this, transient type drift in demo components (`previews/*`) — which
  // get republished as shadcn-registry source and are exercised by tsc but
  // never actually rendered into a layout — keeps blocking ECS deploys.
  typescript: {
    ignoreBuildErrors:
      process.env.NEXT_OUTPUT === "standalone" ||
      process.env.OPEN_NEXT_BUILD === "true" ||
      process.env.CI === "true",
  },
  // Keep native/heavy packages out of the OpenNext esbuild graph when possible.
  // Mermaid is 75MB on disk; OG image renderer is native; octokit only for feedback.
  serverExternalPackages: ["@takumi-rs/image-response", "mermaid", "playwright", "playwright-core"],
  experimental: {
    // No source maps for the server bundle.
    //
    // Turbopack emits them and webpack does not, so apps that stayed on
    // `next build --webpack` (landing) ship 2 MB of maps while every Turbopack
    // app ships hundreds: 138 MB across 132 files here, against 50 MB of actual
    // server JS — 41% of .next/server, and the same shape in forge (68%),
    // router (75%) and idp (70%). Nobody chose this; it arrived with the
    // builder and was never looked at until a 20 GB VM hit 96% and a deploy's
    // SSH session died before its own cleanup could run.
    //
    // They only symbolicate server stack traces and are never served to a
    // browser. Readable traces are worth having, but not at three times the
    // size of the code they describe on a host this tight.
    serverSourceMaps: false,
    // Tree-shake barrel imports so icons/ui do not land wholesale in handler.mjs.
    optimizePackageImports: [
      "@nebutra/icons",
      "@nebutra/ui",
      "@nebutra/ui/primitives",
      "@nebutra/ui/patterns",
      "fumadocs-ui",
      "fumadocs-ui/components",
    ],
  },
  // OpenNext/Workers size cuts:
  // - `@nebutra/ui/primitives` barrel statically imports streamdown → full shiki
  //   (~8 MiB langs). Docs never render MessageContent; stub streamdown out.
  // - Prefer shiki/bundle/web if anything still imports shiki.
  ...(process.env.OPEN_NEXT_BUILD === "true"
    ? {
        turbopack: {
          resolveAlias: {
            shiki: "shiki/bundle/web",
            streamdown: "./src/shims/streamdown-stub.ts",
          },
        },
      }
    : {}),
  transpilePackages: [
    "@nebutra/fonts",
    "@nebutra/ui",
    "@nebutra/tokens",
    "fumadocs-ui",
    "fumadocs-core",
    "fumadocs-mdx",
    "@fumadocs/story",
  ],
  /**
   * fumadocs-mermaid's `./ui` subpath declares only an `import` condition and
   * no `require`. Turbopack resolves it regardless, so `next build` is green
   * and the docs deploy has always passed; the VM artifact runs
   * `next build --webpack`, which honours export conditions strictly and fails
   * with "Package path ./ui is not exported".
   *
   * Aliasing the one subpath is the narrow fix. transpilePackages does not
   * help — resolution happens before transpilation — and adding `import` to
   * the resolver conditions globally pulls server-only code into the client
   * graph, which fails instead on `node:fs/promises`.
   *
   * The target is read out of the package's own exports map rather than typed,
   * so a change to its file layout follows automatically instead of silently
   * pointing at nothing.
   */
  webpack: (config: { resolve: { alias?: Record<string, string> } }) => {
    // Located on disk rather than through require.resolve: this package
    // exports only an `import` condition, so CJS resolution cannot see even
    // its main entry, let alone ./ui. pnpm puts a direct dependency under the
    // app's own node_modules, and Next runs the build with cwd set there.
    const packageRoot = resolvePath(process.cwd(), "node_modules/fumadocs-mermaid");
    const manifestPath = resolvePath(packageRoot, "package.json");
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        exports?: Record<string, { import?: string }>;
      };
      const uiEntry = manifest.exports?.["./ui"]?.import;
      if (uiEntry) {
        config.resolve.alias = {
          ...config.resolve.alias,
          "fumadocs-mermaid/ui": resolvePath(packageRoot, uiEntry),
        };
      }
    }
    return config;
  },

  reactStrictMode: true,
  // Clean-subdomain URL scheme (docs.brand domain/<lang>/<slug>). Old
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
  images: {
    remotePatterns: [{ protocol: "https", hostname: brand.domains.cdn, pathname: "/brand/**" }],
  },
};

export default withMDX(nextConfig);
