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

/**
 * Path this bundle is mounted at on the site that serves it.
 *
 * This is a Next.js zone: documentation is a path on the product it documents,
 * not a host, so the landing app forwards `/docs/*` here unchanged. `basePath`
 * is what makes that forward work — it puts the app's OWN emitted URLs
 * (`_next/*` assets, internal links, redirect Locations, sitemap entries) in the
 * same `/docs` space the visitor is in.
 *
 * Without it the app emitted `/_next/static/...`, which the browser resolved
 * against the VISITOR's host and fetched from the landing app: every stylesheet
 * and script 404'd, so `<site>/docs` rendered as unstyled HTML. Verified before
 * this was set. Same root cause made the sitemap publish `/docs/en/<slug>` —
 * URLs that resolve to nothing — and put sitemap.xml and robots.txt out of
 * reach entirely.
 *
 * Overridable so the bundle can be mounted elsewhere (or at the root, with an
 * empty value) by a deployment that serves its docs differently.
 */
const basePath = process.env.DOCS_BASE_PATH ?? "/docs";

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" as const } : {}),
  ...(basePath ? { basePath } : {}),
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
    "@nebutra/health",
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
  /**
   * Redirects, in the zone's PUBLIC path shape.
   *
   * Two things changed the shape of this table. `basePath` means every `source`
   * here is already under `/docs`, so the old `/docs/<slug>` sources addressed
   * `<site>/docs/docs/<slug>` — a URL nothing links to. And `i18n.hideLocale`
   * means the default language has no segment, so an `/en/<slug>` destination
   * hands the visitor a URL the middleware immediately redirects away from.
   *
   * What remains is what is still true: pages that were RENAMED. A prefix strip
   * needs no entry — landing 308s `/<locale>/docs/*` onto the zone, and the
   * hideLocale rewrite absorbs `/docs/en/*`.
   */
  async redirects() {
    // One taxonomy rename, in both locales. The default language's entry carries
    // no locale segment, matching what the zone actually serves.
    const renamed = (from: string, to: string) => [
      { source: `/${from}`, destination: `/${to}`, permanent: true as const },
      { source: `/zh/${from}`, destination: `/zh/${to}`, permanent: true as const },
    ];

    return [
      {
        source: "/sailor/getting-started",
        destination: "/getting-started/installation",
        permanent: true,
      },
      ...renamed("whitelabel", "customization/overview"),
      ...renamed("billing", "payments/overview"),
      ...renamed("authentication", "guides/authentication"),
      ...renamed("multi-tenancy", "guides/multi-tenancy"),
      ...renamed("ai-integrations", "ai/overview"),
      ...renamed("integrations", "integrations/overview"),
      ...renamed("infrastructure", "deployment/overview"),
      ...renamed("monorepo", "development/project-structure"),
    ];
  },
  // `<lang>/<slug>.mdx` returns the raw Markdown via the llms.mdx internal API.
  // The internal API path keeps its `docs/` segment — it is not a user-visible
  // URL, just the underlying handler at app/llms.mdx/docs/[[...slug]]/route.tsx.
  async rewrites() {
    return [
      {
        source: "/:lang(en|zh)/:path*.mdx",
        // Carry the language through. Dropping it answered `/zh/<slug>.mdx`
        // with the English page.
        destination: "/llms.mdx/docs/:lang/:path*",
      },
      // The same for the default language, whose URLs carry no locale segment
      // under `i18n.hideLocale` — without this, `<slug>.mdx` 404'd for English
      // while `zh/<slug>.mdx` worked.
      {
        source: "/:path*.mdx",
        destination: "/llms.mdx/docs/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: brand.domains.cdn, pathname: "/brand/**" }],
  },
};

export default withMDX(nextConfig);
