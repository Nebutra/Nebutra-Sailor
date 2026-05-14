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
      server: {
        warmup: {
          clientFiles: [
            "../../packages/design/ui/src/primitives/index.ts",
            "../../packages/design/tokens/styles.css",
            "./.storybook/preview.ts",
          ],
        },
      },
    });
  },
};

export default config;
