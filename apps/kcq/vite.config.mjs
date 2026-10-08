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
const { indicatorEntrypointsPlugin } = await import(
  pathToFileURL(resolve(source, "scripts/indicator-entrypoints-plugin.mjs")).href
);
export default {
  root,
  build: {
    rollupOptions: {
      onwarn(warning, handler) {
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") handler(warning);
      },
    },
  },
  server: { host: "127.0.0.1", port: 3130, fs: { allow: [resolve(root, "../.."), source] } },
  plugins: [
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
      { find: /^vue$/, replacement: upstream.resolve("vue/dist/vue.runtime.esm-bundler.js") },
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
};
