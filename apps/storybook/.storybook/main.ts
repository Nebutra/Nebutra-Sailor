import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));

function getAbsolutePath(value: string): string {
  return dirname(require.resolve(`${value}/package.json`));
}

const config: StorybookConfig = {
  stories: [
    // Stories co-located with ui components
    "../../../packages/design/ui/src/**/*.stories.@(ts|tsx)",
    // Local stories for docs/layout demos
    "../src/stories/**/*.stories.@(ts|tsx)",
  ],

  addons: [
    getAbsolutePath("@storybook/addon-essentials"),
    getAbsolutePath("@storybook/addon-interactions"),
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-a11y"),
  ],

  framework: {
    name: getAbsolutePath("@storybook/react-vite") as "@storybook/react-vite",
    options: {},
  },

  docs: {
    autodocs: "tag",
  },

  // Vite governance — see docs/architecture/2026-05-14-storybook-perf-governance.md
  //
  //   resolve.alias:
  //     - `@/*` → apps/web/src (mirrors tsconfig.json paths)
  //     - `next/link` / `next/image` / `next/navigation` / `next/dynamic` /
  //       `next/headers` → local stubs (Next.js runtime references
  //       `process.env` which Vite does not replace; stories transitively
  //       import from apps/web and crash without these stubs).
  //
  //   plugins:
  //     - @tailwindcss/vite v4 (without it, `@import "tailwindcss"` in
  //       preview.css is a no-op — utility classes never generated).
  //
  //   define:
  //     - `process.env.NODE_ENV` belt-and-suspenders fallback for any
  //       remaining lib that bypasses the alias chain.
  //
  //   optimizeDeps.include + server.warmup:
  //     - Pre-bundle heavy deps & warm primitive surface for HMR stability
  //       on 290+ stories.
  viteFinal: async (cfg) => {
    const { mergeConfig } = await import("vite");
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    const stubsDir = resolve(HERE, "./stubs");
    return mergeConfig(cfg, {
      plugins: [tailwindcss()],

      // Stable cache location (survives pnpm install / branch switches).
      cacheDir: resolve(HERE, "../node_modules/.vite-storybook"),

      define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
      },

      resolve: {
        alias: {
          "@": resolve(HERE, "../../web/src"),
          "next/link": resolve(stubsDir, "./next-link.tsx"),
          "next/image": resolve(stubsDir, "./next-image.tsx"),
          "next/navigation": resolve(stubsDir, "./next-navigation.tsx"),
          "next/dynamic": resolve(stubsDir, "./next-dynamic.tsx"),
          "next/headers": resolve(stubsDir, "./next-headers.ts"),
        },
      },

      optimizeDeps: {
        // Keep narrow. Broad include of @lobehub/ui (heavy + many "use client"
        // directives) caused rollup pre-bundle to abort. Apps that need it can
        // add per-package — design-system primitives don't import lobehub here.
        include: [
          "framer-motion",
          "class-variance-authority",
          "clsx",
          "tailwind-merge",
          "lucide-react",
        ],
      },

      // D1 — dev cold-start tuning.
      server: {
        // Skip fs.stat() short-circuit on every request (Vite 6+ feature).
        fs: { cachedChecks: true },
        // HMR overlay rerenders the entire app on the slightest dev error.
        // We rely on console + Storybook's own error display instead.
        hmr: { overlay: false },
        warmup: {
          clientFiles: [
            "../../packages/design/ui/src/primitives/index.ts",
            "../../packages/design/tokens/styles.css",
            "./.storybook/preview.ts",
          ],
        },
      },

      // D2 — build perf tuning. See ADR.
      build: {
        // Skip sourcemap generation (the static build is for verification, not
        // production debugging — saves ~25% wall time + ~50% disk).
        sourcemap: false,
        // Skip gzip size estimation in the report (saves ~10% wall time).
        reportCompressedSize: false,
        rollupOptions: {
          // Suppress noisy warnings that flood I/O without representing real
          // issues: "use client" directives in transitive deps + sourcemap
          // location lookup failures.
          onwarn(
            warning: { code?: string; message?: string },
            defaultHandler: (w: { code?: string; message?: string }) => void,
          ) {
            if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
            if (warning.code === "SOURCEMAP_BROKEN") return;
            if (warning.message?.includes("Error when using sourcemap")) return;
            defaultHandler(warning);
          },
          output: {
            // Split heavy vendor chunks so Rollup caches them independently
            // and the runtime can lazy-load.
            manualChunks: (id: string) => {
              if (id.includes("node_modules")) {
                if (id.includes("framer-motion") || id.includes("/motion/")) return "vendor-motion";
                if (id.includes("three")) return "vendor-three";
                if (id.includes("@lobehub/ui") || id.includes("@lobehub/icons"))
                  return "vendor-lobehub";
                if (id.includes("@base-ui/")) return "vendor-base-ui";
                if (id.includes("recharts")) return "vendor-recharts";
                if (id.includes("@phosphor-icons")) return "vendor-phosphor";
              }
            },
          },
        },
      },
    });
  },
};

export default config;
