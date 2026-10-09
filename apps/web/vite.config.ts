import path from "node:path";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: "./src/vite-app/routes",
      generatedRouteTree: "./src/vite-app/routeTree.gen.ts",
      quoteStyle: "double",
      enableRouteGeneration: false,
    }),
    react(),
    // React Compiler, matching next.config.ts `reactCompiler: true`: automatic
    // memoisation for the Vite build too (plugin-react 6 runs it via Babel).
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    // `pnpm dev` (scripts/dev/preview.ts) moves the port when 3001 is taken.
    port: Number(process.env.PORT) || 3001,
    // A port chosen for this process must be the one it gets: drifting to the
    // next free port would take the one the preview gave the API gateway.
    strictPort: Boolean(process.env.PORT),
    proxy: {
      "/api": {
        target:
          process.env.VITE_API_GATEWAY_URL ??
          process.env.API_GATEWAY_URL ??
          "http://localhost:3002",
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (
            id.includes("react-syntax-highlighter") ||
            id.includes("streamdown") ||
            id.includes("remark-") ||
            id.includes("rehype-") ||
            id.includes("mdast-") ||
            id.includes("hast-") ||
            id.includes("micromark") ||
            id.includes("marked")
          ) {
            return "vendor-rich-rendering";
          }
          if (
            id.includes("@react-three") ||
            id.includes("three") ||
            id.includes("dotted-map") ||
            id.includes("cobe")
          ) {
            return "vendor-visualization";
          }
          if (id.includes("@tanstack")) return "vendor-tanstack";
          if (id.includes("@radix-ui") || id.includes("@nebutra/ui")) return "vendor-ui";
          if (id.includes("react") || id.includes("react-dom")) return "vendor-react";
          return "vendor";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/link": path.resolve(__dirname, "./src/vite-app/next-compat/link.tsx"),
      "next/navigation": path.resolve(__dirname, "./src/vite-app/next-compat/navigation.tsx"),
      "next-intl": path.resolve(__dirname, "./src/vite-app/next-compat/intl.ts"),
    },
  },
});
