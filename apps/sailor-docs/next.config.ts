import { existsSync, readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { brand } from "@nebutra/brand/metadata";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import { TAXONOMY_REDIRECTS } from "./scripts/taxonomy-redirects.mjs";

const withMDX = createMDX({
  configPath: "source.config.ts",
  outDir: ".source",
});

/**
 * Docs is now pure static output (2026-09-29): `next build` runs `output:
 * "export"` and the result is uploaded to Cloudflare as Workers static
 * assets, no Worker script at all — see wrangler.jsonc and
 * scripts/postbuild-static-export.mjs. The prior path (OpenNext →
 * Cloudflare Worker) rendered every page fresh per request with no working
 * cache, which intermittently exceeded the Worker's CPU/resource ceiling
 * (Cloudflare error 1102) even after the incremental-cache fix — a static
 * site has no per-request render to exceed a limit on. `output: "standalone"`
 * is kept only for the ECS self-host target (`NEXT_OUTPUT=standalone`),
 * which still runs `next start` against a real Node process.
 */
const isStaticExport =
  process.env.NEXT_OUTPUT === "export" || process.env.SAILOR_DOCS_OUTPUT === "export";
const useStandalone = process.env.NEXT_OUTPUT === "standalone";

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
  ...(isStaticExport ? { output: "export" as const } : {}),
  ...(basePath ? { basePath } : {}),
  // Handed to `src/lib/base-path.ts` for the raw-string fetch URLs
  // (`next/link` and friends already get basePath rewritten for free and
  // don't need this).
  //
  // NEXT_PUBLIC_GATEWAY_URL: base URL of the gateway that serves
  // /api/v1/docs/chat and /api/v1/docs/feedback (backends/gateway/src/routes/
  // docs/). Production is api.nebutra.com; the template embeds the gateway
  // inside apps/web, so a template deployment sets this to that app's origin.
  // Baked in at build time (this is a static export — there is no request
  // time to read it from). Unset: src/lib/gateway-client.ts's
  // isGatewayConfigured() returns false and both UIs degrade gracefully.
  env: {
    NEXT_PUBLIC_DOCS_BASE_PATH: basePath,
    NEXT_PUBLIC_GATEWAY_URL: process.env.NEXT_PUBLIC_GATEWAY_URL ?? "",
  },
  // output: "export" has no Image Optimization API to call (no server), so
  // every next/image use must skip it. Applying this unconditionally rather
  // than gating it to isStaticExport keeps one image config for every target
  // instead of two that can drift.
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: brand.domains.cdn, pathname: "/brand/**" }],
  },
  // Skip in-build tsc on production deploys — the strict typecheck runs as
  // its own pre-push lefthook job (`pnpm --filter @nebutra/sailor-docs
  // typecheck`), so the build pipeline doesn't need to redo it.
  typescript: {
    ignoreBuildErrors:
      process.env.NEXT_OUTPUT === "standalone" ||
      process.env.OPEN_NEXT_BUILD === "true" ||
      isStaticExport ||
      process.env.CI === "true",
  },
  // Keep native/heavy packages out of the build graph when possible. Mermaid
  // is 75MB on disk; OG image renderer is native; octokit only for feedback.
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
  // Bundle size cuts (Worker size limits no longer apply now that docs is a
  // static export, but the static bundle still ships to every visitor, so
  // keep it lean):
  // - `@nebutra/ui/primitives` barrel statically imports streamdown → full shiki
  //   (~8 MiB langs). Docs never render MessageContent; stub streamdown out.
  // - Prefer shiki/bundle/web if anything still imports shiki.
  ...(process.env.OPEN_NEXT_BUILD === "true" || isStaticExport
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
   * `redirects()` and `rewrites()` require a server to evaluate on every
   * request — Next refuses to build at all with `output: "export"` if either
   * key is present, regardless of what it returns. Both are therefore static-
   * export-only OMITTED here (not just made to return `[]`), and their
   * public-facing behavior is reproduced as real static files instead:
   *
   *  - the taxonomy-rename redirect table below becomes real static HTML
   *    "meta refresh" redirect pages, written by
   *    scripts/postbuild-static-export.mjs from this same table (imported,
   *    not duplicated) so the two can't drift.
   *  - the `<slug>.mdx` shorthand becomes a plain file copy of the already
   *    statically-exported `/llms.mdx/docs/<lang>/<slug>` route output, done
   *    by the same postbuild script.
   *
   * See that script for both. Kept live (not omitted) for the ECS standalone
   * target, which still runs `next start` against a real Node process.
   */
  ...(isStaticExport
    ? {}
    : {
        async redirects() {
          return TAXONOMY_REDIRECTS.map(({ source, destination }) => ({
            source,
            destination,
            permanent: true as const,
          }));
        },
        // `<lang>/<slug>.mdx` returns the raw Markdown via the llms.mdx internal
        // API. The internal API path keeps its `docs/` segment — it is not a
        // user-visible URL, just the underlying handler at
        // app/llms.mdx/docs/[[...slug]]/route.tsx.
        async rewrites() {
          return [
            {
              source: "/:lang(en|zh)/:path*.mdx",
              // Carry the language through. Dropping it answered
              // `/zh/<slug>.mdx` with the English page.
              destination: "/llms.mdx/docs/:lang/:path*",
            },
            // The same for the default language, whose URLs carry no locale
            // segment under `i18n.hideLocale` — without this, `<slug>.mdx`
            // 404'd for English while `zh/<slug>.mdx` worked.
            {
              source: "/:path*.mdx",
              destination: "/llms.mdx/docs/:path*",
            },
          ];
        },
      }),
};

export default withMDX(nextConfig);
