/** Reuse upstream compiler plugins and export-derived aliases, without copying its demo app. */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const source = resolve(process.env.KCQ_SOURCE_DIR);
const local = createRequire(import.meta.url);
const { default: tailwindcss } = await import("@tailwindcss/vite");
const upstream = createRequire(resolve(source, "package.json"));
const load = (id) => import(pathToFileURL(upstream.resolve(id)).href);
// Vite is already running when its config loads; await plugins sequentially
// because the patched Babel plugin also requires the Vite ESM module.
await load("vite");
const { default: vue } = await load("@vitejs/plugin-vue");
const { default: babelModule } = await load("vite-plugin-babel");
const babel = babelModule.default;
const { default: Icons } = await load("unplugin-icons/vite");
const { createCoreSourceAliases } = await import(
  pathToFileURL(resolve(source, "scripts/core-source-aliases.mjs")).href
);
const { kcqLandingPlugin } = await import(
  pathToFileURL(resolve(root, "scripts/landing-plugin.mjs")).href
);
const { publicBoundary } = await import(
  pathToFileURL(resolve(root, "scripts/public-boundary.mjs")).href
);
const { indicatorEntrypointsPlugin } = await import(
  pathToFileURL(resolve(source, "scripts/indicator-entrypoints-plugin.mjs")).href
);
const vueRuntime = upstream.resolve("vue/dist/vue.runtime.esm-bundler.js");

/** Dev only: mirror nginx (`/` → `/app`, public paths → public.html; see infra/fly/kcq.nginx.conf). */
function devRoutes() {
  return {
    name: "kcq-dev-routes",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const [path, query] = (req.url ?? "/").split("?");
          const { APP_PATH, matchPublicRoute } =
            await server.ssrLoadModule("/src/public/routes.ts");
          if (path === "/") {
            res.statusCode = 302;
            res.setHeader("Location", APP_PATH + (query ? `?${query}` : ""));
            res.end();
            return;
          }
          if (matchPublicRoute(path)) req.url = "/public.html";
          next();
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

/**
 * Two entries: index.html is the authenticated app (SPA), public.html the prerendered public
 * pages. The SSR build (`--ssr src/public/entry-server.ts`) only feeds scripts/prerender.mjs.
 */
export default ({ isSsrBuild }) => ({
  root,
  build: {
    // The prerender links each page's lazy route CSS and chunks (src/public/entry-server.ts).
    ssrManifest: !isSsrBuild,
    rollupOptions: {
      ...(isSsrBuild
        ? {}
        : { input: { index: resolve(root, "index.html"), public: resolve(root, "public.html") } }),
      onwarn(warning, handler) {
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") handler(warning);
      },
    },
  },
  // Bundle everything for prerender so Vue, the router and unhead share one runtime instance.
  ssr: { noExternal: true },
  define: {
    __VUE_I18N_FULL_INSTALL__: "true",
    __VUE_I18N_LEGACY_API__: "false",
    __INTLIFY_PROD_DEVTOOLS__: "false",
  },
  server: { host: "127.0.0.1", port: 3130, fs: { allow: [resolve(root, "../.."), source] } },
  plugins: [
    devRoutes(),
    kcqLandingPlugin({ root, source }),
    ...(isSsrBuild ? [] : [publicBoundary()]),
    tailwindcss(),
    indicatorEntrypointsPlugin(),
    babel({
      include: [/\/src\/.*\.ts$/],
      exclude: [/node_modules/],
      babelConfig: {
        babelrc: false,
        configFile: false,
        sourceMaps: true,
        plugins: [
          [upstream.resolve("@babel/plugin-proposal-decorators"), { version: "2023-11" }],
          [upstream.resolve("@babel/plugin-transform-typescript")],
        ],
      },
    }),
    vue(),
    Icons({ compiler: "vue3", autoInstall: false }),
  ],
  esbuild: { jsx: "automatic" },
  resolve: {
    extensions: [".mjs", ".js", ".ts", ".tsx", ".jsx", ".json", ".vue"],
    dedupe: ["vue", "react", "react-dom"],
    alias: [
      {
        find: "kcq-geist-font.woff2",
        replacement: resolve(
          dirname(local.resolve("geist/font/sans")),
          "fonts/geist-sans/Geist-Variable.woff2",
        ),
      },
      {
        find: "kcq-outfit-600.woff2",
        replacement: local.resolve("@fontsource/outfit/files/outfit-latin-600-normal.woff2"),
      },
      {
        find: "kcq-geist-mono-font.woff2",
        replacement: resolve(
          dirname(local.resolve("geist/font/sans")),
          "fonts/geist-mono/GeistMono-Regular.woff2",
        ),
      },
      {
        find: /^@nebutra\/ui\/primitives\/canonical$/,
        replacement: resolve(root, "../../packages/design/ui/src/primitives/canonical.ts"),
      },
      {
        find: /^@nebutra\/icons$/,
        replacement: resolve(root, "../../packages/design/icons/src/index.ts"),
      },
      { find: /^react$/, replacement: local.resolve("react") },
      { find: /^react-dom\/client$/, replacement: local.resolve("react-dom/client") },
      {
        find: /^@nebutra\/auth\/browser$/,
        replacement: resolve(root, "../../packages/iam/auth/src/browser.ts"),
      },
      {
        find: /^@nebutra\/tokens\/styles.css$/,
        replacement: resolve(root, "../../packages/design/tokens/styles.css"),
      },
      { find: /^vue$/, replacement: vueRuntime },
      {
        find: /^vue\/server-renderer$/,
        replacement: resolve(dirname(vueRuntime), "../server-renderer/index.mjs"),
      },
      {
        find: /^@363045841yyt\/klinechart$/,
        replacement: resolve(source, "packages/vue/src/index.ts"),
      },
      ...createCoreSourceAliases(resolve(source, "packages/core/src")),
      {
        find: /^@363045841yyt\/klinechart-agent-runtime\/browser$/,
        replacement: resolve(source, "packages/agent-runtime/src/browser.ts"),
      },
      {
        find: /^@363045841yyt\/klinechart-agent-runtime\/contracts\/ui$/,
        replacement: resolve(source, "packages/agent-runtime/src/contracts/ui.ts"),
      },
      {
        find: /^@363045841yyt\/klinechart-agent-runtime$/,
        replacement: resolve(source, "packages/agent-runtime/src/index.ts"),
      },
    ],
  },
});
